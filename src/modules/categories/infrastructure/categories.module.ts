import { Module } from '@nestjs/common';
import { CreateCategoryUseCase } from '../application/create-category.use-case';
import { FindCategoryByIdUseCase } from '../application/find-category-by-id.use-case';
import { ListCategoriesUseCase } from '../application/list-categories.use-case';
import { SetCategoryActiveUseCase } from '../application/set-category-active.use-case';
import { UpdateCategoryUseCase } from '../application/update-category.use-case';
import { ICategoryRepository } from '../domain/categories.repository.interface';
import { CategoriesController } from './categories.controller';
import { CategoryRepository } from './categories.repository';

@Module({
  controllers: [CategoriesController],
  providers: [
    { provide: ICategoryRepository, useClass: CategoryRepository },
    CreateCategoryUseCase,
    ListCategoriesUseCase,
    FindCategoryByIdUseCase,
    UpdateCategoryUseCase,
    SetCategoryActiveUseCase,
  ],
  exports: [ICategoryRepository, FindCategoryByIdUseCase],
})
export class CategoriesModule {}
