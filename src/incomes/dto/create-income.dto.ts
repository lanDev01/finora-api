import { Type } from 'class-transformer';
import { IsDateString, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

export class CreateIncomeDto {
  @IsString()
  description: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Type(() => Number)
  amount: number;

  @IsDateString()
  date: string;

  @IsString()
  categoryId: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
