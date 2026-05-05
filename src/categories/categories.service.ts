import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  create(userId: string, dto: CreateCategoryDto) {
    const data: { name: string; userId: string; color?: string; icon?: string } = {
      name: dto.name,
      userId,
    };
    if (dto.color !== undefined && dto.color !== '') {
      data.color = dto.color;
    }
    if (dto.icon !== undefined && dto.icon !== '') {
      data.icon = dto.icon;
    }
    return this.prisma.category.create({ data });
  }

  findAll(userId: string) {
    return this.prisma.category.findMany({
      where: { userId },
      orderBy: { name: 'asc' },
    });
  }

  async remove(userId: string, categoryId: string) {
    const category = await this.prisma.category.findFirst({
      where: { id: categoryId, userId },
    });

    if (!category) throw new NotFoundException('Categoria não encontrada.');

    return this.prisma.category.delete({ where: { id: categoryId } });
  }
}
