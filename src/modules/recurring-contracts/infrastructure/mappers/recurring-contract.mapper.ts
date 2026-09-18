import { RecurringContractModel as PrismaRecurringContract } from 'generated/prisma/models';
import { RecurringContractEntity } from '../../domain/recurring-contract.entity';

export class RecurringContractMapper {
  static toDomain(
    this: void,
    raw: PrismaRecurringContract,
  ): RecurringContractEntity {
    const entity = new RecurringContractEntity();

    entity.id = raw.id;
    entity.companyId = raw.company_id;
    entity.sourceRequestId = raw.source_request_id;
    entity.supplierId = raw.supplier_id;
    entity.costCenterId = raw.cost_center_id;
    entity.categoryId = raw.category_id;
    entity.chartAccountId = raw.chart_account_id;
    entity.title = raw.title;
    entity.amountCents = raw.amount_cents;
    entity.frequency = raw.frequency;
    entity.startDate = raw.start_date;
    entity.nextOccurrenceDate = raw.next_occurrence_date;
    entity.active = raw.active;
    entity.canceledAt = raw.canceled_at;
    entity.cancelReason = raw.cancel_reason;
    entity.createdById = raw.created_by_id;
    entity.createdAt = raw.created_at;
    entity.updatedAt = raw.updated_at;

    return entity;
  }
}
