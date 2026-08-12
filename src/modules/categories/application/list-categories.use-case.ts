import { Injectable } from '@nestjs/common';
import {
  ICategoryRepository,
  ListCategoriesFilter,
} from '../domain/categories.repository.interface';
import { CategoryEntity } from '../domain/category.entity';

@Injectable()
export class ListCategoriesUseCase {
  constructor(private readonly categoryRepository: ICategoryRepository) {}

  execute(
    companyId: string,
    filter?: ListCategoriesFilter,
  ): Promise<CategoryEntity[]> {
    return this.categoryRepository.list(companyId, filter);
  }
}
