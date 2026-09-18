import { RequestAllocationModel as PrismaRequestAllocation } from 'generated/prisma/models';
import { RequestAllocationEntity } from '../../domain/request-allocation.entity';

export class RequestAllocationMapper {
  static toDomain(
    this: void,
    raw: PrismaRequestAllocation,
  ): RequestAllocationEntity {
    const entity = new RequestAllocationEntity();

    entity.id = raw.id;
    entity.purchaseRequestId = raw.purchase_request_id;
    entity.costCenterId = raw.cost_center_id;
    entity.chartAccountId = raw.chart_account_id;
    entity.shareBps = raw.share_bps;
    entity.createdAt = raw.created_at;

    return entity;
  }
}
