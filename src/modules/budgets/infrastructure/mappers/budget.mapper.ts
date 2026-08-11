import { BudgetModel as PrismaBudget } from 'generated/prisma/models';
import { BudgetEntity } from '../../domain/budget.entity';

export class BudgetMapper {
  static toDomain(this: void, raw: PrismaBudget): BudgetEntity {
    const entity = new BudgetEntity();

    entity.id = raw.id;
    entity.costCenterId = raw.cost_center_id;
    entity.periodStart = raw.period_start;
    entity.periodEnd = raw.period_end;
    entity.totalAmountCents = raw.total_amount_cents;
    entity.changeReason = raw.change_reason;
    entity.updatedById = raw.updated_by_id;
    entity.createdAt = raw.created_at;
    entity.updatedAt = raw.updated_at;

    return entity;
  }
}
