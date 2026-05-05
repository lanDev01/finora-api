import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Total gasto por categoria no mês/ano informado.
   * Usado para o gráfico de pizza/donut.
   */
  async getByCategory(userId: string, month: number, year: number) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);

    const expenses = await this.prisma.expense.findMany({
      where: { userId, date: { gte: start, lt: end } },
      include: { category: true },
    });

    // Agrupa por categoria
    const grouped = expenses.reduce<
      Record<string, { name: string; color: string; total: number }>
    >((acc, expense) => {
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

  /**
   * Total gasto por mês nos últimos 12 meses.
   * Usado para o gráfico de barras/linha.
   */
  async getLast12Months(userId: string) {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 11, 1);

    const expenses = await this.prisma.expense.findMany({
      where: { userId, date: { gte: start } },
    });

    // Gera os 12 meses como chaves
    const months: Record<string, number> = {};
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      months[key] = 0;
    }

    // Soma os valores por mês
    for (const expense of expenses) {
      const d = new Date(expense.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (key in months) {
        months[key] += Number(expense.amount);
      }
    }

    return Object.entries(months).map(([month, total]) => ({ month, total }));
  }

  /**
   * Resumo do mês atual: total gasto, maior categoria, comparação com mês anterior.
   */
  async getMonthlySummary(userId: string, month: number, year: number) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);
    const prevStart = new Date(year, month - 2, 1);

    const [current, previous] = await Promise.all([
      this.prisma.expense.aggregate({
        where: { userId, date: { gte: start, lt: end } },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.expense.aggregate({
        where: { userId, date: { gte: prevStart, lt: start } },
        _sum: { amount: true },
      }),
    ]);

    const currentTotal = Number(current._sum.amount ?? 0);
    const previousTotal = Number(previous._sum.amount ?? 0);
    const diff = previousTotal > 0
      ? ((currentTotal - previousTotal) / previousTotal) * 100
      : 0;

    return {
      total: currentTotal,
      count: current._count,
      previousTotal,
      percentChange: Math.round(diff * 10) / 10,
    };
  }

  /**
   * Totais do mês para os cards da home: receitas, despesas, saldo e % vs mês anterior.
   */
  async getDashboardSummary(userId: string, month: number, year: number) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);
    const prevStart = new Date(year, month - 2, 1);

    const [incomeCur, incomePrev, expCur, expPrev] = await Promise.all([
      this.prisma.income.aggregate({
        where: { userId, date: { gte: start, lt: end } },
        _sum: { amount: true },
      }),
      this.prisma.income.aggregate({
        where: { userId, date: { gte: prevStart, lt: start } },
        _sum: { amount: true },
      }),
      this.prisma.expense.aggregate({
        where: { userId, date: { gte: start, lt: end } },
        _sum: { amount: true },
      }),
      this.prisma.expense.aggregate({
        where: { userId, date: { gte: prevStart, lt: start } },
        _sum: { amount: true },
      }),
    ]);

    const incomeTotal = Number(incomeCur._sum.amount ?? 0);
    const incomePrevTotal = Number(incomePrev._sum.amount ?? 0);
    const expenseTotal = Number(expCur._sum.amount ?? 0);
    const expensePrevTotal = Number(expPrev._sum.amount ?? 0);

    const balance = incomeTotal - expenseTotal;
    const balancePrev = incomePrevTotal - expensePrevTotal;

    const pct = (current: number, previous: number) => {
      if (previous > 0) {
        return Math.round(((current - previous) / previous) * 1000) / 10;
      }
      return 0;
    };

    return {
      incomeTotal,
      expenseTotal,
      balance,
      incomePercentChange: pct(incomeTotal, incomePrevTotal),
      expensePercentChange: pct(expenseTotal, expensePrevTotal),
      balancePercentChange: pct(balance, balancePrev),
    };
  }
}
