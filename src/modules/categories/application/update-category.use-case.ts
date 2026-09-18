import { Injectable } from '@nestjs/common';
import { isUniqueViolation } from 'src/shared/domain/prisma-error';
import { CategoryNameTakenError } from '../domain/categories.errors';
import { ICategoryRepository } from '../domain/categories.repository.interface';
import { CategoryEntity } from '../domain/category.entity';
import { UpdateCategoryDto } from '../dto/update-category.dto';
import { FindCategoryByIdUseCase } from './find-category-by-id.use-case';
import { ResolveDefaultAccountUseCase } from './resolve-default-account.use-case';

@Injectable()
export class UpdateCategoryUseCase {
  constructor(
    private readonly categoryRepository: ICategoryRepository,
    private readonly findCategoryByIdUseCase: FindCategoryByIdUseCase,
    private readonly resolveDefaultAccountUseCase: ResolveDefaultAccountUseCase,
  ) {}

  async execute(
    id: string,
    companyId: string,
    data: UpdateCategoryDto,
  ): Promise<CategoryEntity> {
    await this.findCategoryByIdUseCase.execute(id, companyId);

    const defaultAccountId = await this.resolveDefaultAccountUseCase.execute(
      data.defaultAccountId,
      companyId,
    );

    try {
      return await this.categoryRepository.update(id, {
        name: data.name,
        description: data.description,
        defaultAccountId,
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new CategoryNameTakenError(data.name ?? '');
      }
      throw error;
    }
  }
}
