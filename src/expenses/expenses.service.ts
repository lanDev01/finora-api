import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExpenseDto } from './dto/create-expense.dto';

@Injectable()
export class ExpensesService {
  constructor(private prisma: PrismaService) {}

  create(userId: string, dto: CreateExpenseDto) {
    return this.prisma.expense.create({
      data: {
        description: dto.description,
        amount: dto.amount,
        date: new Date(dto.date),
        notes: dto.notes,
        userId,
        categoryId: dto.categoryId,
      },
      include: { category: true },
    });
  }

  findAll(userId: string, filters?: { month?: number; year?: number }) {
    const where: any = { userId };

    if (filters?.month && filters?.year) {
      const start = new Date(filters.year, filters.month - 1, 1);
      const end = new Date(filters.year, filters.month, 1);
      where.date = { gte: start, lt: end };
    }

    return this.prisma.expense.findMany({
      where,
      include: { category: true },
      orderBy: { date: 'desc' },
    });
  }

  async findOne(userId: string, expenseId: string) {
    const expense = await this.prisma.expense.findFirst({
      where: { id: expenseId, userId },
      include: { category: true },
    });

    if (!expense) throw new NotFoundException('Despesa não encontrada.');
    return expense;
  }

  async remove(userId: string, expenseId: string) {
    await this.findOne(userId, expenseId); // Valida ownership
    return this.prisma.expense.delete({ where: { id: expenseId } });
  }
}
