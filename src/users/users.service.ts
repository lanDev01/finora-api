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

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private upload: UploadService,
  ) {}

  // ─── Campos internos necessários para derivar o provider ─────────────────
  private readonly userSelect = {
    id: true,
    name: true,
    email: true,
    avatar: true,
    createdAt: true,
    githubId: true,
    googleId: true,
  } as const;

  /** Converte a linha do banco para o formato público, derivando `provider`. */
  private toUserResponse(user: {
    id: string;
    name: string;
    email: string;
    avatar: string | null;
    createdAt: Date;
    githubId: string | null;
    googleId: string | null;
  }) {
    const { githubId, googleId, ...rest } = user;
    const provider = githubId ? 'github' : googleId ? 'google' : 'local';
    return { ...rest, provider };
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
      // Busca avatar atual para deletar do storage após o upload do novo
      const current = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { avatar: true },
      });

      avatarUrl = await this.upload.uploadImage(file.buffer, 'avatars');

      if (current?.avatar) {
        const publicId = this.upload.extractPublicId(current.avatar);
        if (publicId) {
          // Deleção não-bloqueante: falha silenciosa para não abortar a requisição
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
