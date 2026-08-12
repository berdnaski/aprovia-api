import { Injectable } from '@nestjs/common';
import { isUniqueViolation } from 'src/shared/domain/prisma-error';
import { CategoryNameTakenError } from '../domain/categories.errors';
import { ICategoryRepository } from '../domain/categories.repository.interface';
import { CategoryEntity } from '../domain/category.entity';
import { UpdateCategoryDto } from '../dto/update-category.dto';
import { FindCategoryByIdUseCase } from './find-category-by-id.use-case';

@Injectable()
export class UpdateCategoryUseCase {
  constructor(
    private readonly categoryRepository: ICategoryRepository,
    private readonly findCategoryByIdUseCase: FindCategoryByIdUseCase,
  ) {}

  async execute(
    id: string,
    companyId: string,
    data: UpdateCategoryDto,
  ): Promise<CategoryEntity> {
    await this.findCategoryByIdUseCase.execute(id, companyId);

    try {
      return await this.categoryRepository.update(id, {
        name: data.name,
        description: data.description,
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new CategoryNameTakenError(data.name ?? '');
      }
      throw error;
    }
  }
}
