import { Injectable } from '@nestjs/common';
import { isUniqueViolation } from 'src/shared/domain/prisma-error';
import { CategoryNameTakenError } from '../domain/categories.errors';
import { ICategoryRepository } from '../domain/categories.repository.interface';
import { CategoryEntity } from '../domain/category.entity';
import { CreateCategoryDto } from '../dto/create-category.dto';

@Injectable()
export class CreateCategoryUseCase {
  constructor(private readonly categoryRepository: ICategoryRepository) {}

  async execute(
    companyId: string,
    data: CreateCategoryDto,
  ): Promise<CategoryEntity> {
    try {
      return await this.categoryRepository.create({
        companyId,
        name: data.name,
        description: data.description ?? null,
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new CategoryNameTakenError(data.name);
      }
      throw error;
    }
  }
}
