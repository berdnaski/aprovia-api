import { CostCenterModel as PrismaCostCenter } from 'generated/prisma/models';
import { CostCenterEntity } from '../../domain/cost-center.entity';

export class CostCenterMapper {
  static toDomain(this: void, raw: PrismaCostCenter): CostCenterEntity {
    const entity = new CostCenterEntity();

    entity.id = raw.id;
    entity.companyId = raw.company_id;
    entity.name = raw.name;
    entity.code = raw.code;
    entity.managerId = raw.manager_id;
    entity.parentId = raw.parent_id;
    entity.createdAt = raw.created_at;
    entity.updatedAt = raw.updated_at;
    entity.disabledAt = raw.disabled_at;

    return entity;
  }
}
