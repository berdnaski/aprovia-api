import { PayableAllocationModel as PrismaPayableAllocation } from 'generated/prisma/models';
import { PayableAllocationEntity } from '../../domain/payable-allocation.entity';

export class PayableAllocationMapper {
  static toDomain(
    this: void,
    raw: PrismaPayableAllocation,
  ): PayableAllocationEntity {
    const entity = new PayableAllocationEntity();

    entity.id = raw.id;
    entity.payableId = raw.payable_id;
    entity.costCenterId = raw.cost_center_id;
    entity.chartAccountId = raw.chart_account_id;
    entity.amountCents = raw.amount_cents;
    entity.createdAt = raw.created_at;

    return entity;
  }
}
