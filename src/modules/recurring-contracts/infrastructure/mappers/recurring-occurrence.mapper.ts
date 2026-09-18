import { RecurringContractOccurrenceModel as PrismaOccurrence } from 'generated/prisma/models';
import { RecurringContractOccurrenceEntity } from '../../domain/recurring-contract-occurrence.entity';

export class RecurringOccurrenceMapper {
  static toDomain(
    this: void,
    raw: PrismaOccurrence,
  ): RecurringContractOccurrenceEntity {
    const entity = new RecurringContractOccurrenceEntity();

    entity.id = raw.id;
    entity.contractId = raw.contract_id;
    entity.periodStart = raw.period_start;
    entity.periodEnd = raw.period_end;
    entity.dueDate = raw.due_date;
    entity.expectedAmountCents = raw.expected_amount_cents;
    entity.status = raw.status;
    entity.budgetEntryId = raw.budget_entry_id;
    entity.invoiceId = raw.invoice_id;
    entity.payableId = raw.payable_id;
    entity.overrideNote = raw.override_note;
    entity.createdAt = raw.created_at;
    entity.matchedAt = raw.matched_at;

    return entity;
  }
}
