import { DivergenceKind, MatchStatus } from 'generated/prisma/enums';

export interface MatchOrderItem {
  id: string;
  description: string;
  quantity: string;
  unitPriceCents: bigint;
  receivedQuantity: string;
}

export interface MatchInvoiceItem {
  id: string;
  description: string;
  quantity: string;
  unitPriceCents: bigint;
  totalCents: bigint;
  purchaseOrderItemId: string | null;
}

export interface MatchToleranceInput {
  priceTolerancePercent: string;
  quantityTolerancePercent: string;
}

export interface MatchDivergenceResult {
  kind: DivergenceKind;
  purchaseOrderItemId: string | null;
  invoiceItemId: string | null;
  expectedValue: string;
  actualValue: string;
  differenceCents: bigint | null;
  differencePercent: string | null;
}

export interface ThreeWayMatchInput {
  orderedItems: MatchOrderItem[];
  invoicedItems: MatchInvoiceItem[];
  orderSupplierId: string;
  invoiceIssuerSupplierId: string | null;
  orderTotalCents: bigint;
  invoiceTotalCents: bigint;
  tolerance: MatchToleranceInput;
}

export interface ThreeWayMatchResult {
  status: MatchStatus;
  divergences: MatchDivergenceResult[];
}

function withinTolerance(
  actual: number,
  expected: number,
  tolerancePercent: number,
): boolean {
  if (expected === 0) {
    return actual === 0;
  }

  const allowedExcess = expected * (tolerancePercent / 100);

  return actual <= expected + allowedExcess;
}

function percentDifference(actual: number, expected: number): string {
  if (expected === 0) {
    return actual === 0 ? '0.00' : '100.00';
  }

  return (((actual - expected) / expected) * 100).toFixed(2);
}

export function runThreeWayMatch(
  input: ThreeWayMatchInput,
): ThreeWayMatchResult {
  const divergences: MatchDivergenceResult[] = [];

  if (
    input.invoiceIssuerSupplierId &&
    input.invoiceIssuerSupplierId !== input.orderSupplierId
  ) {
    divergences.push({
      kind: DivergenceKind.SUPPLIER_MISMATCH,
      purchaseOrderItemId: null,
      invoiceItemId: null,
      expectedValue: input.orderSupplierId,
      actualValue: input.invoiceIssuerSupplierId,
      differenceCents: null,
      differencePercent: null,
    });
  }

  const priceTolerance = Number(input.tolerance.priceTolerancePercent);
  const quantityTolerance = Number(input.tolerance.quantityTolerancePercent);

  for (const invoiceItem of input.invoicedItems) {
    const orderItem = input.orderedItems.find(
      (candidate) => candidate.id === invoiceItem.purchaseOrderItemId,
    );

    if (!orderItem) {
      divergences.push({
        kind: DivergenceKind.ITEM_NOT_IN_ORDER,
        purchaseOrderItemId: null,
        invoiceItemId: invoiceItem.id,
        expectedValue: '—',
        actualValue: invoiceItem.description,
        differenceCents: null,
        differencePercent: null,
      });
      continue;
    }

    if (
      !withinTolerance(
        Number(invoiceItem.unitPriceCents),
        Number(orderItem.unitPriceCents),
        priceTolerance,
      )
    ) {
      divergences.push({
        kind: DivergenceKind.PRICE_ABOVE_ORDER,
        purchaseOrderItemId: orderItem.id,
        invoiceItemId: invoiceItem.id,
        expectedValue: orderItem.unitPriceCents.toString(),
        actualValue: invoiceItem.unitPriceCents.toString(),
        differenceCents: invoiceItem.unitPriceCents - orderItem.unitPriceCents,
        differencePercent: percentDifference(
          Number(invoiceItem.unitPriceCents),
          Number(orderItem.unitPriceCents),
        ),
      });
    }

    if (
      !withinTolerance(
        Number(invoiceItem.quantity),
        Number(orderItem.receivedQuantity),
        quantityTolerance,
      )
    ) {
      divergences.push({
        kind: DivergenceKind.QUANTITY_ABOVE_RECEIVED,
        purchaseOrderItemId: orderItem.id,
        invoiceItemId: invoiceItem.id,
        expectedValue: orderItem.receivedQuantity,
        actualValue: invoiceItem.quantity,
        differenceCents: null,
        differencePercent: percentDifference(
          Number(invoiceItem.quantity),
          Number(orderItem.receivedQuantity),
        ),
      });
    }

    if (
      Number(invoiceItem.quantity) >
      Number(orderItem.quantity) * (1 + quantityTolerance / 100)
    ) {
      divergences.push({
        kind: DivergenceKind.QUANTITY_ABOVE_ORDER,
        purchaseOrderItemId: orderItem.id,
        invoiceItemId: invoiceItem.id,
        expectedValue: orderItem.quantity,
        actualValue: invoiceItem.quantity,
        differenceCents: null,
        differencePercent: percentDifference(
          Number(invoiceItem.quantity),
          Number(orderItem.quantity),
        ),
      });
    }
  }

  for (const orderItem of input.orderedItems) {
    const invoiced = input.invoicedItems.some(
      (candidate) => candidate.purchaseOrderItemId === orderItem.id,
    );

    if (!invoiced && Number(orderItem.receivedQuantity) > 0) {
      divergences.push({
        kind: DivergenceKind.ITEM_NOT_INVOICED,
        purchaseOrderItemId: orderItem.id,
        invoiceItemId: null,
        expectedValue: orderItem.description,
        actualValue: '—',
        differenceCents: null,
        differencePercent: null,
      });
    }
  }

  if (
    !withinTolerance(
      Number(input.invoiceTotalCents),
      Number(input.orderTotalCents),
      priceTolerance,
    )
  ) {
    divergences.push({
      kind: DivergenceKind.TOTAL_MISMATCH,
      purchaseOrderItemId: null,
      invoiceItemId: null,
      expectedValue: input.orderTotalCents.toString(),
      actualValue: input.invoiceTotalCents.toString(),
      differenceCents: input.invoiceTotalCents - input.orderTotalCents,
      differencePercent: percentDifference(
        Number(input.invoiceTotalCents),
        Number(input.orderTotalCents),
      ),
    });
  }

  return {
    status: divergences.length ? MatchStatus.DIVERGENT : MatchStatus.MATCHED,
    divergences,
  };
}
