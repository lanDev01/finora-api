import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-github2';
import { AuthService } from '../auth.service';

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor(
    config: ConfigService,
    private authService: AuthService,
  ) {
    super({
      clientID: config.get<string>('GITHUB_CLIENT_ID')!,
      clientSecret: config.get<string>('GITHUB_CLIENT_SECRET')!,
      callbackURL: config.get<string>('GITHUB_CALLBACK_URL')!,
      scope: ['user:email'],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: any,
  ) {
    const email =
      profile.emails?.[0]?.value || `${profile.username}@github.com`;

    return this.authService.findOrCreateSocialUser({
      provider: 'github',
      providerId: profile.id,
      email,
      name: profile.displayName || profile.username,
      avatar: profile.photos?.[0]?.value,
    });
  }
}
