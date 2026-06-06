import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CategoryType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  create(userId: string, dto: CreateCategoryDto) {
    const data: {
      name: string;
      userId: string;
      type: CategoryType;
      color?: string;
      icon?: string;
    } = {
      name: dto.name,
      userId,
      type: dto.type,
    };
    if (dto.color !== undefined && dto.color !== '') {
      data.color = dto.color;
    }
    if (dto.icon !== undefined && dto.icon !== '') {
      data.icon = dto.icon;
    }
    return this.prisma.category.create({ data });
  }

  findAll(userId: string, type?: CategoryType) {
    return this.prisma.category.findMany({
      where: {
        userId,
        ...(type ? { type } : {}),
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(userId: string, categoryId: string) {
    const category = await this.prisma.category.findFirst({
      where: { id: categoryId, userId },
    });

    if (!category) throw new NotFoundException('Categoria não encontrada.');

    return category;
  }

  async update(userId: string, categoryId: string, dto: UpdateCategoryDto) {
    const category = await this.findOne(userId, categoryId);

    if (dto.type !== undefined && dto.type !== category.type) {
      await this.assertTypeChangeAllowed(categoryId, dto.type);
    }

    const data: UpdateCategoryDto = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.color !== undefined) data.color = dto.color;
    if (dto.icon !== undefined) data.icon = dto.icon;
    if (dto.type !== undefined) data.type = dto.type;

    return this.prisma.category.update({
      where: { id: categoryId },
      data,
    });
  }

  async remove(userId: string, categoryId: string) {
    const category = await this.findOne(userId, categoryId);

    const [expenseCount, incomeCount] = await Promise.all([
      this.prisma.expense.count({ where: { categoryId: category.id } }),
      this.prisma.income.count({ where: { categoryId: category.id } }),
    ]);

    if (expenseCount > 0 || incomeCount > 0) {
      throw new BadRequestException(
        'Não é possível excluir uma categoria com despesas ou receitas vinculadas.',
      );
    }

    return this.prisma.category.delete({ where: { id: categoryId } });
  }

  private async assertTypeChangeAllowed(categoryId: string, newType: CategoryType) {
    if (newType === CategoryType.INCOME) {
      const expenseCount = await this.prisma.expense.count({ where: { categoryId } });
      if (expenseCount > 0) {
        throw new BadRequestException(
          'Não é possível alterar para receita: existem despesas vinculadas a esta categoria.',
        );
      }
    }

    if (newType === CategoryType.EXPENSE) {
      const incomeCount = await this.prisma.income.count({ where: { categoryId } });
      if (incomeCount > 0) {
        throw new BadRequestException(
          'Não é possível alterar para despesa: existem receitas vinculadas a esta categoria.',
        );
      }
    }
  }
}
