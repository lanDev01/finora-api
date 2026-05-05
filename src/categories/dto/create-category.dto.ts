import { Transform } from 'class-transformer';
import { IsHexColor, IsIn, IsOptional, IsString } from 'class-validator';
import { ALLOWED_CATEGORY_ICONS } from '../allowed-category-icons';

export class CreateCategoryDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsHexColor()
  color?: string;

  @Transform(({ value }) => {
    if (value === '' || value === null || value === undefined) return undefined;
    return typeof value === 'string' ? value.trim() : value;
  })
  @IsOptional()
  @IsString()
  @IsIn([...ALLOWED_CATEGORY_ICONS], { message: 'Ícone inválido.' })
  icon?: string;
}
