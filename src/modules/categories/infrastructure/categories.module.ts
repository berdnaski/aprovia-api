import { Module } from '@nestjs/common';
import { ChartAccountsModule } from 'src/modules/chart-accounts/infrastructure/chart-accounts.module';
import { CreateCategoryUseCase } from '../application/create-category.use-case';
import { FindCategoryByIdUseCase } from '../application/find-category-by-id.use-case';
import { ListCategoriesUseCase } from '../application/list-categories.use-case';
import { ResolveDefaultAccountUseCase } from '../application/resolve-default-account.use-case';
import { SetCategoryActiveUseCase } from '../application/set-category-active.use-case';
import { UpdateCategoryUseCase } from '../application/update-category.use-case';
import { ICategoryRepository } from '../domain/categories.repository.interface';
import { CategoriesController } from './categories.controller';
import { CategoryRepository } from './categories.repository';

@Module({
  imports: [ChartAccountsModule],
  controllers: [CategoriesController],
  providers: [
    { provide: ICategoryRepository, useClass: CategoryRepository },
    CreateCategoryUseCase,
    ListCategoriesUseCase,
    FindCategoryByIdUseCase,
    UpdateCategoryUseCase,
    SetCategoryActiveUseCase,
    ResolveDefaultAccountUseCase,
  ],
  exports: [ICategoryRepository, FindCategoryByIdUseCase],
})
export class CategoriesModule {}
