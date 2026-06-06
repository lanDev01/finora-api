import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CategoryType, type User } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  @Get('by-category')
  getByCategory(
    @CurrentUser() user: User,
    @Query('month') month: string,
    @Query('year') year: string,
    @Query('type') type?: string,
  ) {
    const now = new Date();
    const m = month ? parseInt(month, 10) : now.getUTCMonth() + 1;
    const y = year ? parseInt(year, 10) : now.getUTCFullYear();
    const categoryType =
      type === 'INCOME' ? CategoryType.INCOME : CategoryType.EXPENSE;
    return this.analyticsService.getByCategory(user.id, m, y, categoryType);
  }

  @Get('evolution')
  getEvolution(@CurrentUser() user: User, @Query('months') months?: string) {
    const count = months ? parseInt(months, 10) : 12;
    return this.analyticsService.getEvolution(user.id, count);
  }

  /** @deprecated use /evolution */
  @Get('last-12-months')
  getLast12Months(@CurrentUser() user: User) {
    return this.analyticsService.getLast12Months(user.id);
  }

  @Get('compare')
  getCompare(
    @CurrentUser() user: User,
    @Query('month') month: string,
    @Query('year') year: string,
    @Query('compareMonth') compareMonth?: string,
    @Query('compareYear') compareYear?: string,
  ) {
    const now = new Date();
    const m = month ? parseInt(month, 10) : now.getUTCMonth() + 1;
    const y = year ? parseInt(year, 10) : now.getUTCFullYear();
    const cm = compareMonth ? parseInt(compareMonth, 10) : undefined;
    const cy = compareYear ? parseInt(compareYear, 10) : undefined;
    return this.analyticsService.getPeriodComparison(user.id, m, y, cm, cy);
  }

  @Get('summary')
  getSummary(
    @CurrentUser() user: User,
    @Query('month') month: string,
    @Query('year') year: string,
  ) {
    const now = new Date();
    return this.analyticsService.getMonthlySummary(
      user.id,
      month ? parseInt(month, 10) : now.getUTCMonth() + 1,
      year ? parseInt(year, 10) : now.getUTCFullYear(),
    );
  }

  @Get('dashboard')
  getDashboard(
    @CurrentUser() user: User,
    @Query('month') month: string,
    @Query('year') year: string,
  ) {
    const now = new Date();
    return this.analyticsService.getDashboardSummary(
      user.id,
      month ? parseInt(month, 10) : now.getUTCMonth() + 1,
      year ? parseInt(year, 10) : now.getUTCFullYear(),
    );
  }
}
