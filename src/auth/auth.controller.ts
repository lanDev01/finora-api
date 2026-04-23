import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { SignInDto } from './dto/sign-in.dto';
import { SignUpDto } from './dto/sign-up.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  // ─── Email/Senha ──────────────────────────────────────────────────────────

  @Post('sign-up')
  signUp(@Body() dto: SignUpDto) {
    return this.authService.signUp(dto);
  }

  @Post('sign-in')
  signIn(@Body() dto: SignInDto) {
    return this.authService.signIn(dto);
  }

  // ─── GitHub OAuth ─────────────────────────────────────────────────────────

  /** Inicia o fluxo OAuth — redireciona para o GitHub */
  @Get('github')
  @UseGuards(AuthGuard('github'))
  githubLogin() {
    // O Passport cuida do redirect automaticamente
  }

  /** Callback do GitHub após autorização */
  @Get('github/callback')
  @UseGuards(AuthGuard('github'))
  githubCallback(@Req() req: Request, @Res() res: Response) {
    const { accessToken, user } = req.user as any;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';

    // Redireciona para o frontend com o token na URL
    // O frontend captura via query param e armazena
    res.redirect(
      `${frontendUrl}/auth/social-callback?token=${accessToken}&email=${user.email}`,
    );
  }

  // ─── Google OAuth ─────────────────────────────────────────────────────────

  /** Inicia o fluxo OAuth — redireciona para o Google */
  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleLogin() {
    // O Passport cuida do redirect automaticamente
  }

  /** Callback do Google após autorização */
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  googleCallback(@Req() req: Request, @Res() res: Response) {
    const { accessToken, user } = req.user as any;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';

    res.redirect(
      `${frontendUrl}/auth/social-callback?token=${accessToken}&email=${user.email}`,
    );
  }
}
