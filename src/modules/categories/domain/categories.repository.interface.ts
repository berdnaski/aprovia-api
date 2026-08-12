import { TransactionContext } from 'src/shared/domain/transaction.manager';
import { CategoryEntity } from './category.entity';

export interface CreateCategoryData {
  companyId: string;
  name: string;
  description: string | null;
}

export interface UpdateCategoryData {
  name?: string;
  description?: string | null;
}

export interface ListCategoriesFilter {
  includeInactive?: boolean;
}

export abstract class ICategoryRepository {
  abstract create(data: CreateCategoryData): Promise<CategoryEntity>;

  abstract findById(
    id: string,
    context?: TransactionContext,
  ): Promise<CategoryEntity | null>;

  abstract list(
    companyId: string,
    filter?: ListCategoriesFilter,
  ): Promise<CategoryEntity[]>;

  abstract update(
    id: string,
    data: UpdateCategoryData,
  ): Promise<CategoryEntity>;

  abstract setActive(id: string, active: boolean): Promise<CategoryEntity>;
}
