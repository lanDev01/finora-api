import { IsString, MinLength } from 'class-validator';

export class UpdateProfileDto {
  @IsString()
  @MinLength(2, { message: 'O nome deve ter pelo menos 2 caracteres.' })
  name: string;
}
