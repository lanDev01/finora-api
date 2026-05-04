import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateIncomeDto } from './dto/create-income.dto';

@Injectable()
export class IncomesService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateIncomeDto) {
    // Verifica se a categoria pertence ao usuário
    const category = await this.prisma.category.findFirst({
      where: { id: dto.categoryId, userId },
    });

    if (!category) {
      throw new NotFoundException(
        'Categoria não encontrada ou não pertence ao usuário.',
      );
    }

    return this.prisma.income.create({
      data: {
        description: dto.description,
        amount: dto.amount,
        date: new Date(dto.date),
        notes: dto.notes,
        categoryId: dto.categoryId,
        userId,
      },
      include: { category: true },
    });
  }

  async findAll(userId: string, filters?: { month?: number; year?: number }) {
    const where: any = { userId };

    if (filters?.month && filters?.year) {
      const startDate = new Date(filters.year, filters.month - 1, 1);
      const endDate = new Date(filters.year, filters.month, 0, 23, 59, 59, 999);
      where.date = { gte: startDate, lte: endDate };
    }

    return this.prisma.income.findMany({
      where,
      include: { category: true },
      orderBy: { date: 'desc' },
    });
  }

  async findOne(userId: string, incomeId: string) {
    const income = await this.prisma.income.findFirst({
      where: { id: incomeId, userId },
      include: { category: true },
    });

    if (!income) throw new NotFoundException('Receita não encontrada.');
    return income;
  }

  async update(userId: string, incomeId: string, dto: CreateIncomeDto) {
    await this.findOne(userId, incomeId);

    const category = await this.prisma.category.findFirst({
      where: { id: dto.categoryId, userId },
    });
    if (!category) {
      throw new NotFoundException('Categoria não encontrada ou não pertence ao usuário.');
    }

    return this.prisma.income.update({
      where: { id: incomeId },
      data: {
        description: dto.description,
        amount: dto.amount,
        date: new Date(dto.date),
        notes: dto.notes,
        categoryId: dto.categoryId,
      },
      include: { category: true },
    });
  }

  async remove(userId: string, incomeId: string) {
    await this.findOne(userId, incomeId); // Valida ownership
    return this.prisma.income.delete({ where: { id: incomeId } });
  }
}
