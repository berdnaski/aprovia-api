import { Injectable } from '@nestjs/common';
import { isUniqueViolation } from 'src/shared/domain/prisma-error';
import { CategoryNameTakenError } from '../domain/categories.errors';
import { ICategoryRepository } from '../domain/categories.repository.interface';
import { CategoryEntity } from '../domain/category.entity';
import { CreateCategoryDto } from '../dto/create-category.dto';
import { ResolveDefaultAccountUseCase } from './resolve-default-account.use-case';

@Injectable()
export class CreateCategoryUseCase {
  constructor(
    private readonly categoryRepository: ICategoryRepository,
    private readonly resolveDefaultAccountUseCase: ResolveDefaultAccountUseCase,
  ) {}

  async execute(
    companyId: string,
    data: CreateCategoryDto,
  ): Promise<CategoryEntity> {
    const defaultAccountId = await this.resolveDefaultAccountUseCase.execute(
      data.defaultAccountId,
      companyId,
    );

    try {
      return await this.categoryRepository.create({
        companyId,
        name: data.name,
        description: data.description ?? null,
        defaultAccountId: defaultAccountId ?? null,
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new CategoryNameTakenError(data.name);
      }
      throw error;
    }
  }
}
