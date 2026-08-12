import { Injectable } from '@nestjs/common';
import {
  ForbiddenError,
  NotFoundError,
} from 'src/shared/domain/errors/domain.error';
import { TransactionContext } from 'src/shared/domain/transaction.manager';
import { ICategoryRepository } from '../domain/categories.repository.interface';
import { CategoryEntity } from '../domain/category.entity';

@Injectable()
export class FindCategoryByIdUseCase {
  constructor(private readonly categoryRepository: ICategoryRepository) {}

  async execute(
    id: string,
    companyId: string,
    context?: TransactionContext,
  ): Promise<CategoryEntity> {
    const category = await this.categoryRepository.findById(id, context);

    if (!category) {
      throw new NotFoundError('Categoria', id);
    }

    if (category.companyId !== companyId) {
      throw new ForbiddenError('Esta categoria pertence a outra empresa');
    }

    return category;
  }
}
