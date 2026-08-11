import { CostCenterMemberModel as PrismaCostCenterMember } from 'generated/prisma/models';
import { CostCenterMemberEntity } from '../../domain/cost-center-member.entity';

export class CostCenterMemberMapper {
  static toDomain(
    this: void,
    raw: PrismaCostCenterMember,
  ): CostCenterMemberEntity {
    const entity = new CostCenterMemberEntity();

    entity.id = raw.id;
    entity.costCenterId = raw.cost_center_id;
    entity.memberId = raw.member_id;
    entity.createdAt = raw.created_at;

    return entity;
  }
}
