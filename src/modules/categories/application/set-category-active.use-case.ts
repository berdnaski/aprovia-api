import { Injectable } from '@nestjs/common';
import { ICategoryRepository } from '../domain/categories.repository.interface';
import { CategoryEntity } from '../domain/category.entity';
import { FindCategoryByIdUseCase } from './find-category-by-id.use-case';

@Injectable()
export class SetCategoryActiveUseCase {
  constructor(
    private readonly categoryRepository: ICategoryRepository,
    private readonly findCategoryByIdUseCase: FindCategoryByIdUseCase,
  ) {}

  async execute(
    id: string,
    companyId: string,
    active: boolean,
  ): Promise<CategoryEntity> {
    const category = await this.findCategoryByIdUseCase.execute(id, companyId);

    if (category.active === active) {
      return category;
    }

    return this.categoryRepository.setActive(id, active);
  }
}
