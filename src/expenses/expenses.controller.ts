import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Post,
    Query, UseGuards,
} from '@nestjs/common';
import type { User } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { ExpensesService } from './expenses.service';

@Controller('expenses')
@UseGuards(JwtAuthGuard)
export class ExpensesController {
  constructor(private expensesService: ExpensesService) {}

  @Post()
  create(@CurrentUser() user: User, @Body() dto: CreateExpenseDto) {
    return this.expensesService.create(user.id, dto);
  }

  /**
   * GET /api/expenses?month=3&year=2026
   * Retorna todas as despesas do usuário, com filtro opcional por mês/ano
   */
  @Get()
  findAll(
    @CurrentUser() user: User,
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    return this.expensesService.findAll(user.id, {
      month: month ? parseInt(month) : undefined,
      year: year ? parseInt(year) : undefined,
    });
  }

  @Get(':id')
  findOne(@CurrentUser() user: User, @Param('id') id: string) {
    return this.expensesService.findOne(user.id, id);
  }

  @Delete(':id')
  remove(@CurrentUser() user: User, @Param('id') id: string) {
    return this.expensesService.remove(user.id, id);
  }
}
