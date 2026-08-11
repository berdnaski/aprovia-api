import { BudgetEntryModel as PrismaBudgetEntry } from 'generated/prisma/models';
import { BudgetEntryEntity } from '../../domain/budget-entry.entity';

export class BudgetEntryMapper {
  static toDomain(this: void, raw: PrismaBudgetEntry): BudgetEntryEntity {
    const entity = new BudgetEntryEntity();

    entity.id = raw.id;
    entity.budgetId = raw.budget_id;
    entity.purchaseRequestId = raw.purchase_request_id;
    entity.type = raw.type;
    entity.amountCents = raw.amount_cents;
    entity.description = raw.description;
    entity.recordedById = raw.recorded_by_id;
    entity.occurredAt = raw.occurred_at;

    return entity;
  }
}
