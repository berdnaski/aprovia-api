import {
  MatchDivergenceModel as PrismaMatchDivergence,
  MatchResultModel as PrismaMatchResult,
} from 'generated/prisma/models';
import {
  MatchDivergenceEntity,
  MatchResultEntity,
} from '../../domain/match-result.entity';

export class MatchDivergenceMapper {
  static toDomain(
    this: void,
    raw: PrismaMatchDivergence,
  ): MatchDivergenceEntity {
    const entity = new MatchDivergenceEntity();

    entity.id = raw.id;
    entity.matchResultId = raw.match_result_id;
    entity.kind = raw.kind;
    entity.purchaseOrderItemId = raw.purchase_order_item_id;
    entity.invoiceItemId = raw.invoice_item_id;
    entity.expectedValue = raw.expected_value;
    entity.actualValue = raw.actual_value;
    entity.differenceCents = raw.difference_cents;
    entity.differencePercent = raw.difference_percent?.toString() ?? null;

    return entity;
  }
}

export class MatchResultMapper {
  static toDomain(
    this: void,
    raw: PrismaMatchResult & { divergences?: PrismaMatchDivergence[] },
  ): MatchResultEntity {
    const entity = new MatchResultEntity();

    entity.id = raw.id;
    entity.companyId = raw.company_id;
    entity.purchaseOrderId = raw.purchase_order_id;
    entity.invoiceId = raw.invoice_id;
    entity.status = raw.status;
    entity.checkedAt = raw.checked_at;
    entity.priceTolerancePercent = raw.price_tolerance_percent.toString();
    entity.quantityTolerancePercent = raw.quantity_tolerance_percent.toString();
    entity.orderedAmountCents = raw.ordered_amount_cents;
    entity.receivedAmountCents = raw.received_amount_cents;
    entity.invoicedAmountCents = raw.invoiced_amount_cents;
    entity.resolvedById = raw.resolved_by_id;
    entity.resolvedAt = raw.resolved_at;
    entity.resolutionNote = raw.resolution_note;
    entity.createdAt = raw.created_at;
    entity.updatedAt = raw.updated_at;

    if (raw.divergences) {
      entity.divergences = raw.divergences.map(MatchDivergenceMapper.toDomain);
    }

    return entity;
  }
}
