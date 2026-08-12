import { Injectable } from '@nestjs/common';
import { TransactionContext } from 'src/shared/domain/transaction.manager';
import { prismaClient } from 'src/shared/infrastructure/database/prisma-transaction.manager';
import { PrismaService } from 'src/shared/infrastructure/database/prisma.service';
import {
  CreateCategoryData,
  ICategoryRepository,
  ListCategoriesFilter,
  UpdateCategoryData,
} from '../domain/categories.repository.interface';
import { CategoryEntity } from '../domain/category.entity';
import { CategoryMapper } from './mappers/category.mapper';

@Injectable()
export class CategoryRepository implements ICategoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateCategoryData): Promise<CategoryEntity> {
    const raw = await this.prisma.category.create({
      data: {
        company_id: data.companyId,
        name: data.name,
        description: data.description,
      },
    });

    return CategoryMapper.toDomain(raw);
  }

  async findById(
    id: string,
    context?: TransactionContext,
  ): Promise<CategoryEntity | null> {
    const raw = await prismaClient(this.prisma, context).category.findUnique({
      where: { id },
    });

    return raw ? CategoryMapper.toDomain(raw) : null;
  }

  async list(
    companyId: string,
    filter?: ListCategoriesFilter,
  ): Promise<CategoryEntity[]> {
    const records = await this.prisma.category.findMany({
      where: {
        company_id: companyId,
        active: filter?.includeInactive ? undefined : true,
      },
      orderBy: { name: 'asc' },
    });

    return records.map(CategoryMapper.toDomain);
  }

  async update(id: string, data: UpdateCategoryData): Promise<CategoryEntity> {
    const raw = await this.prisma.category.update({
      where: { id },
      data: { name: data.name, description: data.description },
    });

    return CategoryMapper.toDomain(raw);
  }

  async setActive(id: string, active: boolean): Promise<CategoryEntity> {
    const raw = await this.prisma.category.update({
      where: { id },
      data: { active },
    });

    return CategoryMapper.toDomain(raw);
  }
}
