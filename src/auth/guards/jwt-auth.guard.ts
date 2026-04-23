import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/** Use @UseGuards(JwtAuthGuard) em qualquer rota que exija login */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
