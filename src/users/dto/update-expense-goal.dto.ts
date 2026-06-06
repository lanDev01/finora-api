import { Transform } from 'class-transformer';
import { IsNumber, IsOptional, Min, ValidateIf } from 'class-validator';

export class UpdateExpenseGoalDto {
  @IsOptional()
  @Transform(({ value }) => {
    if (value === null || value === undefined || value === '') return null;
    const n = typeof value === 'string' ? parseFloat(value.replace(',', '.')) : Number(value);
    return Number.isFinite(n) ? n : value;
  })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount?: number | null;
}
