import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import type { User } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateIncomeDto } from './dto/create-income.dto';
import { IncomesService } from './incomes.service';

@Controller('incomes')
@UseGuards(JwtAuthGuard)
export class IncomesController {
  constructor(private incomesService: IncomesService) {}

  @Post()
  create(@CurrentUser() user: User, @Body() dto: CreateIncomeDto) {
    return this.incomesService.create(user.id, dto);
  }

  /**
   * GET /api/incomes?month=3&year=2026
   * Retorna todas as receitas do usuário, com filtro opcional por mês/ano
   */
  @Get()
  findAll(
    @CurrentUser() user: User,
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    return this.incomesService.findAll(user.id, {
      month: month ? parseInt(month) : undefined,
      year: year ? parseInt(year) : undefined,
    });
  }

  @Get(':id')
  findOne(@CurrentUser() user: User, @Param('id') id: string) {
    return this.incomesService.findOne(user.id, id);
  }

  @Put(':id')
  update(@CurrentUser() user: User, @Param('id') id: string, @Body() dto: CreateIncomeDto) {
    return this.incomesService.update(user.id, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: User, @Param('id') id: string) {
    return this.incomesService.remove(user.id, id);
  }
}
