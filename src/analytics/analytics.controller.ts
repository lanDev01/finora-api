import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import type { User } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  /**
   * GET /api/analytics/by-category?month=3&year=2026
   * Retorna gastos agrupados por categoria (para gráfico de pizza)
   */
  @Get('by-category')
  getByCategory(
    @CurrentUser() user: User,
    @Query('month') month: string,
    @Query('year') year: string,
  ) {
    const now = new Date();
    return this.analyticsService.getByCategory(
      user.id,
      month ? parseInt(month) : now.getMonth() + 1,
      year ? parseInt(year) : now.getFullYear(),
    );
  }

  /**
   * GET /api/analytics/last-12-months
   * Retorna total por mês nos últimos 12 meses (para gráfico de linha/barras)
   */
  @Get('last-12-months')
  getLast12Months(@CurrentUser() user: User) {
    return this.analyticsService.getLast12Months(user.id);
  }

  /**
   * GET /api/analytics/summary?month=3&year=2026
   * Resumo do mês: total, contagem e comparação com mês anterior
   */
  @Get('summary')
  getSummary(
    @CurrentUser() user: User,
    @Query('month') month: string,
    @Query('year') year: string,
  ) {
    const now = new Date();
    return this.analyticsService.getMonthlySummary(
      user.id,
      month ? parseInt(month) : now.getMonth() + 1,
      year ? parseInt(year) : now.getFullYear(),
    );
  }

  /**
   * GET /api/analytics/dashboard?month=3&year=2026
   * Receitas, despesas, saldo e variação % vs mês anterior (cards da home).
   */
  @Get('dashboard')
  getDashboard(
    @CurrentUser() user: User,
    @Query('month') month: string,
    @Query('year') year: string,
  ) {
    const now = new Date();
    return this.analyticsService.getDashboardSummary(
      user.id,
      month ? parseInt(month) : now.getMonth() + 1,
      year ? parseInt(year) : now.getFullYear(),
    );
  }
}
