import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { UploadService } from '../upload/upload.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

function currentMonthKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private upload: UploadService,
  ) {}

  private readonly userSelect = {
    id: true,
    name: true,
    email: true,
    avatar: true,
    createdAt: true,
    githubId: true,
    googleId: true,
    monthlyExpenseGoal: true,
    expenseGoalConfirmedMonth: true,
  } as const;

  private toUserResponse(user: {
    id: string;
    name: string;
    email: string;
    avatar: string | null;
    createdAt: Date;
    githubId: string | null;
    googleId: string | null;
    monthlyExpenseGoal: { toString(): string } | null;
    expenseGoalConfirmedMonth: string | null;
  }) {
    const { githubId, googleId, monthlyExpenseGoal, ...rest } = user;
    const provider = githubId ? 'github' : googleId ? 'google' : 'local';
    return {
      ...rest,
      provider,
      monthlyExpenseGoal:
        monthlyExpenseGoal !== null ? Number(monthlyExpenseGoal) : null,
    };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: this.userSelect,
    });
    return user ? this.toUserResponse(user) : null;
  }

  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
    file?: Express.Multer.File,
  ) {
    let avatarUrl: string | undefined;

    if (file) {
      const current = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { avatar: true },
      });

      avatarUrl = await this.upload.uploadImage(file.buffer, 'avatars');

      if (current?.avatar) {
        const publicId = this.upload.extractPublicId(current.avatar);
        if (publicId) {
          this.upload.deleteImage(publicId).catch(() => undefined);
        }
      }
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        name: dto.name,
        ...(avatarUrl !== undefined && { avatar: avatarUrl }),
      },
      select: this.userSelect,
    });
    return this.toUserResponse(updated);
  }

  async updateExpenseGoal(userId: string, amount: number | null | undefined) {
    const monthKey = currentMonthKey();

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        monthlyExpenseGoal: amount === null || amount === undefined ? null : amount,
        expenseGoalConfirmedMonth: monthKey,
      },
      select: this.userSelect,
    });

    return this.toUserResponse(updated);
  }

  async confirmExpenseGoalMonth(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { monthlyExpenseGoal: true },
    });

    if (user?.monthlyExpenseGoal === null) {
      throw new BadRequestException('Nenhuma meta de gastos definida.');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { expenseGoalConfirmedMonth: currentMonthKey() },
      select: this.userSelect,
    });

    return this.toUserResponse(updated);
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { password: true, githubId: true, googleId: true },
    });

    if (!user?.password) {
      throw new ForbiddenException(
        'Esta conta está vinculada a um provedor social e não possui senha. Use o login social para acessar.',
      );
    }

    const passwordMatch = await bcrypt.compare(
      dto.currentPassword,
      user.password,
    );
    if (!passwordMatch) {
      throw new BadRequestException('Senha atual incorreta.');
    }

    const hashed = await bcrypt.hash(dto.newPassword, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashed },
    });
  }
}
