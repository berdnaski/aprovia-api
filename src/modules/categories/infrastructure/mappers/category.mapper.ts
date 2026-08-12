import { CategoryModel as PrismaCategory } from 'generated/prisma/models';
import { CategoryEntity } from '../../domain/category.entity';

export class CategoryMapper {
  static toDomain(this: void, raw: PrismaCategory): CategoryEntity {
    const entity = new CategoryEntity();

    entity.id = raw.id;
    entity.companyId = raw.company_id;
    entity.name = raw.name;
    entity.description = raw.description;
    entity.active = raw.active;
    entity.createdAt = raw.created_at;
    entity.updatedAt = raw.updated_at;

    return entity;
  }
}
