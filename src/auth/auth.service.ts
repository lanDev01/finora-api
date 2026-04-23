import {
    ConflictException,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { SignInDto } from './dto/sign-in.dto';
import { SignUpDto } from './dto/sign-up.dto';

interface SocialUserPayload {
  provider: 'github' | 'google';
  providerId: string;
  email: string;
  name: string;
  avatar?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  // ─── Cadastro com email/senha ─────────────────────────────────────────────

  async signUp(dto: SignUpDto) {
    const exists = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (exists) {
      throw new ConflictException('Este e-mail já está cadastrado.');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        password: hashedPassword,
      },
    });

    return this.generateToken(user.id, user.email);
  }

  // ─── Login com email/senha ────────────────────────────────────────────────

  async signIn(dto: SignInDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user || !user.password) {
      throw new UnauthorizedException('Credenciais inválidas.');
    }

    const passwordMatch = await bcrypt.compare(dto.password, user.password);

    if (!passwordMatch) {
      throw new UnauthorizedException('Credenciais inválidas.');
    }

    return this.generateToken(user.id, user.email);
  }

  // ─── Social Login (GitHub / Google) ──────────────────────────────────────

  async findOrCreateSocialUser(payload: SocialUserPayload) {
    const providerField =
      payload.provider === 'github' ? 'githubId' : 'googleId';

    // Verifica se já existe um usuário com esse ID do provider
    let user = await this.prisma.user.findFirst({
      where: { [providerField]: payload.providerId },
    });

    if (!user) {
      // Verifica se já existe um usuário com o mesmo e-mail (conta existente)
      user = await this.prisma.user.findUnique({
        where: { email: payload.email },
      });

      if (user) {
        // Vincula o provider à conta existente
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: { [providerField]: payload.providerId },
        });
      } else {
        // Cria um novo usuário
        user = await this.prisma.user.create({
          data: {
            name: payload.name,
            email: payload.email,
            avatar: payload.avatar,
            [providerField]: payload.providerId,
          },
        });
      }
    }

    return this.generateToken(user.id, user.email);
  }

  // ─── Utilitário ───────────────────────────────────────────────────────────

  private generateToken(userId: string, email: string) {
    const payload = { sub: userId, email };

    return {
      accessToken: this.jwt.sign(payload),
      user: { id: userId, email },
    };
  }
}
