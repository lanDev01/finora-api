import { Injectable } from '@nestjs/common';
import { CategoryType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  calendarMonthKeyFromIso,
  monthKey,
  monthKeysForLastNMonths,
  monthRangeUtc,
  shiftMonth,
} from './analytics-date.util';

export interface CategoryBreakdownItem {
  name: string;
  color: string;
  total: number;
}

export interface PeriodTotals {
  month: string;
  incomeTotal: number;
  expenseTotal: number;
  balance: number;
}

export interface EvolutionPoint {
  month: string;
  income: number;
  expense: number;
  balance: number;
}

export interface PeriodComparisonResponse {
  current: PeriodTotals & { expensesByCategory: CategoryBreakdownItem[] };
  compare: PeriodTotals & { expensesByCategory: CategoryBreakdownItem[] };
}

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getByCategory(
    userId: string,
    month: number,
    year: number,
    type: CategoryType = CategoryType.EXPENSE,
  ): Promise<CategoryBreakdownItem[]> {
    const { start, end } = monthRangeUtc(month, year);

    if (type === CategoryType.EXPENSE) {
      const expenses = await this.prisma.expense.findMany({
        where: { userId, date: { gte: start, lt: end } },
        include: { category: true },
      });

      const grouped = expenses.reduce<
        Record<string, { name: string; color: string; total: number }>
      >((acc, expense) => {
        if (expense.category.type !== CategoryType.EXPENSE) return acc;
        const id = expense.categoryId;
        if (!acc[id]) {
          acc[id] = {
            name: expense.category.name,
            color: expense.category.color,
            total: 0,
          };
        }
        acc[id].total += Number(expense.amount);
        return acc;
      }, {});

      return Object.values(grouped).sort((a, b) => b.total - a.total);
    }

    const incomes = await this.prisma.income.findMany({
      where: { userId, date: { gte: start, lt: end } },
      include: { category: true },
    });

    const grouped = incomes.reduce<
      Record<string, { name: string; color: string; total: number }>
    >((acc, income) => {
      if (income.category.type !== CategoryType.INCOME) return acc;
      const id = income.categoryId;
      if (!acc[id]) {
        acc[id] = {
          name: income.category.name,
          color: income.category.color,
          total: 0,
        };
      }
      acc[id].total += Number(income.amount);
      return acc;
    }, {});

    return Object.values(grouped).sort((a, b) => b.total - a.total);
  }

  async getLast12Months(userId: string) {
    return this.getEvolution(userId, 12);
  }

  async getEvolution(userId: string, months = 12): Promise<EvolutionPoint[]> {
    const safeMonths = Math.min(Math.max(months, 1), 24);
    const keys = monthKeysForLastNMonths(safeMonths);
    const start = monthRangeUtc(
      parseInt(keys[0].split('-')[1], 10),
      parseInt(keys[0].split('-')[0], 10),
    ).start;

    const [expenses, incomes] = await Promise.all([
      this.prisma.expense.findMany({
        where: { userId, date: { gte: start } },
        select: { amount: true, date: true },
      }),
      this.prisma.income.findMany({
        where: { userId, date: { gte: start } },
        select: { amount: true, date: true },
      }),
    ]);

    const bucket: Record<string, { income: number; expense: number }> = {};
    for (const key of keys) {
      bucket[key] = { income: 0, expense: 0 };
    }

    for (const expense of expenses) {
      const key = calendarMonthKeyFromIso(expense.date);
      if (bucket[key]) bucket[key].expense += Number(expense.amount);
    }

    for (const income of incomes) {
      const key = calendarMonthKeyFromIso(income.date);
      if (bucket[key]) bucket[key].income += Number(income.amount);
    }

    return keys.map((month) => ({
      month,
      income: bucket[month].income,
      expense: bucket[month].expense,
      balance: bucket[month].income - bucket[month].expense,
    }));
  }

  async getPeriodComparison(
    userId: string,
    month: number,
    year: number,
    compareMonth?: number,
    compareYear?: number,
  ): Promise<PeriodComparisonResponse> {
    const compare =
      compareMonth && compareYear
        ? { month: compareMonth, year: compareYear }
        : shiftMonth(month, year, -1);

    const [current, comparePeriod] = await Promise.all([
      this.getPeriodTotals(userId, month, year),
      this.getPeriodTotals(userId, compare.month, compare.year),
    ]);

    const [currentCategories, compareCategories] = await Promise.all([
      this.getByCategory(userId, month, year, CategoryType.EXPENSE),
      this.getByCategory(userId, compare.month, compare.year, CategoryType.EXPENSE),
    ]);

    return {
      current: { ...current, expensesByCategory: currentCategories },
      compare: { ...comparePeriod, expensesByCategory: compareCategories },
    };
  }

  async getMonthlySummary(userId: string, month: number, year: number) {
    const totals = await this.getPeriodTotals(userId, month, year);
    const prev = shiftMonth(month, year, -1);
    const prevTotals = await this.getPeriodTotals(userId, prev.month, prev.year);

    const diff =
      prevTotals.expenseTotal > 0
        ? ((totals.expenseTotal - prevTotals.expenseTotal) / prevTotals.expenseTotal) * 100
        : 0;

    const count = await this.prisma.expense.count({
      where: {
        userId,
        date: {
          gte: monthRangeUtc(month, year).start,
          lt: monthRangeUtc(month, year).end,
        },
      },
    });

    return {
      total: totals.expenseTotal,
      count,
      previousTotal: prevTotals.expenseTotal,
      percentChange: Math.round(diff * 10) / 10,
    };
  }

  async getDashboardSummary(userId: string, month: number, year: number) {
    const current = await this.getPeriodTotals(userId, month, year);
    const prev = shiftMonth(month, year, -1);
    const previous = await this.getPeriodTotals(userId, prev.month, prev.year);

    const pct = (cur: number, prevVal: number) => {
      if (prevVal > 0) return Math.round(((cur - prevVal) / prevVal) * 1000) / 10;
      return 0;
    };

    return {
      incomeTotal: current.incomeTotal,
      expenseTotal: current.expenseTotal,
      balance: current.balance,
      incomePercentChange: pct(current.incomeTotal, previous.incomeTotal),
      expensePercentChange: pct(current.expenseTotal, previous.expenseTotal),
      balancePercentChange: pct(current.balance, previous.balance),
    };
  }

  private async getPeriodTotals(
    userId: string,
    month: number,
    year: number,
  ): Promise<PeriodTotals> {
    const { start, end } = monthRangeUtc(month, year);

    const [incomeAgg, expenseAgg] = await Promise.all([
      this.prisma.income.aggregate({
        where: { userId, date: { gte: start, lt: end } },
        _sum: { amount: true },
      }),
      this.prisma.expense.aggregate({
        where: { userId, date: { gte: start, lt: end } },
        _sum: { amount: true },
      }),
    ]);

    const incomeTotal = Number(incomeAgg._sum.amount ?? 0);
    const expenseTotal = Number(expenseAgg._sum.amount ?? 0);

    return {
      month: monthKey(month, year),
      incomeTotal,
      expenseTotal,
      balance: incomeTotal - expenseTotal,
    };
  }
}
