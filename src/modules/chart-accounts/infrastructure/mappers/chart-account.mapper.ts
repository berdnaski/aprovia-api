import { ChartAccountModel as PrismaChartAccount } from 'generated/prisma/models';
import { ChartAccountEntity } from '../../domain/chart-account.entity';

export class ChartAccountMapper {
  static toDomain(this: void, raw: PrismaChartAccount): ChartAccountEntity {
    const entity = new ChartAccountEntity();

    entity.id = raw.id;
    entity.companyId = raw.company_id;
    entity.parentId = raw.parent_id;
    entity.code = raw.code;
    entity.name = raw.name;
    entity.kind = raw.kind;
    entity.postable = raw.postable;
    entity.externalCode = raw.external_code;
    entity.active = raw.active;
    entity.createdAt = raw.created_at;
    entity.updatedAt = raw.updated_at;

    return entity;
  }
}
