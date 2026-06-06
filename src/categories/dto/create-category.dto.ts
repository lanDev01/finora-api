import { Transform } from 'class-transformer';
import { IsEnum, IsHexColor, IsIn, IsOptional, IsString } from 'class-validator';
import { CategoryType } from '@prisma/client';
import { ALLOWED_CATEGORY_ICONS } from '../allowed-category-icons';

export class CreateCategoryDto {
  @IsString()
  name: string;

  @IsEnum(CategoryType)
  type: CategoryType;

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
