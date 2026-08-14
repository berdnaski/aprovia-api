import { DivergenceKind, MatchStatus } from 'generated/prisma/enums';
import { runThreeWayMatch, ThreeWayMatchInput } from './three-way-match.service';

const baseTolerance = {
  priceTolerancePercent: '2.00',
  quantityTolerancePercent: '0.00',
};

const orderItem = (overrides: Partial<ThreeWayMatchInput['orderedItems'][0]> = {}) => ({
  id: 'item-1',
  description: 'Notebook',
  quantity: '10.000',
  unitPriceCents: 250000n,
  receivedQuantity: '10.000',
  ...overrides,
});

const invoiceItem = (overrides: Partial<ThreeWayMatchInput['invoicedItems'][0]> = {}) => ({
  id: 'inv-item-1',
  description: 'Notebook',
  quantity: '10.000',
  unitPriceCents: 250000n,
  totalCents: 2500000n,
  purchaseOrderItemId: 'item-1',
  ...overrides,
});

const baseInput = (overrides: Partial<ThreeWayMatchInput> = {}): ThreeWayMatchInput => ({
  orderedItems: [orderItem()],
  invoicedItems: [invoiceItem()],
  orderSupplierId: 'supplier-1',
  invoiceIssuerSupplierId: 'supplier-1',
  orderTotalCents: 2500000n,
  invoiceTotalCents: 2500000n,
  tolerance: baseTolerance,
  ...overrides,
});

describe('runThreeWayMatch', () => {
  it('aprova quando tudo bate exatamente', () => {
    const result = runThreeWayMatch(baseInput());

    expect(result.status).toBe(MatchStatus.MATCHED);
    expect(result.divergences).toHaveLength(0);
  });

  it('aprova quando a diferença de preço está dentro da tolerância', () => {
    const result = runThreeWayMatch(
      baseInput({
        invoicedItems: [invoiceItem({ unitPriceCents: 255000n })],
        invoiceTotalCents: 2550000n,
      }),
    );

    expect(result.status).toBe(MatchStatus.MATCHED);
  });

  it('acusa PRICE_ABOVE_ORDER quando o preço excede a tolerância', () => {
    const result = runThreeWayMatch(
      baseInput({
        invoicedItems: [invoiceItem({ unitPriceCents: 300000n })],
        invoiceTotalCents: 3000000n,
      }),
    );

    expect(result.status).toBe(MatchStatus.DIVERGENT);
    expect(result.divergences).toContainEqual(
      expect.objectContaining({ kind: DivergenceKind.PRICE_ABOVE_ORDER }),
    );
  });

  it('acusa QUANTITY_ABOVE_RECEIVED quando fatura mais do que recebeu', () => {
    const result = runThreeWayMatch(
      baseInput({
        orderedItems: [orderItem({ receivedQuantity: '8.000' })],
        invoicedItems: [invoiceItem({ quantity: '10.000' })],
      }),
    );

    expect(result.divergences).toContainEqual(
      expect.objectContaining({
        kind: DivergenceKind.QUANTITY_ABOVE_RECEIVED,
      }),
    );
  });

  it('acusa QUANTITY_ABOVE_ORDER quando fatura mais do que foi pedido', () => {
    const result = runThreeWayMatch(
      baseInput({
        orderedItems: [orderItem({ quantity: '10.000', receivedQuantity: '15.000' })],
        invoicedItems: [invoiceItem({ quantity: '15.000' })],
      }),
    );

    expect(result.divergences).toContainEqual(
      expect.objectContaining({ kind: DivergenceKind.QUANTITY_ABOVE_ORDER }),
    );
  });

  it('acusa ITEM_NOT_IN_ORDER quando a nota tem item que não foi pedido', () => {
    const result = runThreeWayMatch(
      baseInput({
        invoicedItems: [invoiceItem({ purchaseOrderItemId: null })],
      }),
    );

    expect(result.divergences).toContainEqual(
      expect.objectContaining({ kind: DivergenceKind.ITEM_NOT_IN_ORDER }),
    );
  });

  it('acusa ITEM_NOT_INVOICED quando um item recebido não veio na nota', () => {
    const result = runThreeWayMatch(
      baseInput({
        orderedItems: [orderItem(), orderItem({ id: 'item-2', receivedQuantity: '3.000' })],
      }),
    );

    expect(result.divergences).toContainEqual(
      expect.objectContaining({
        kind: DivergenceKind.ITEM_NOT_INVOICED,
        purchaseOrderItemId: 'item-2',
      }),
    );
  });

  it('não acusa ITEM_NOT_INVOICED quando nada foi recebido do item ainda', () => {
    const result = runThreeWayMatch(
      baseInput({
        orderedItems: [orderItem(), orderItem({ id: 'item-2', receivedQuantity: '0.000' })],
      }),
    );

    expect(result.divergences).not.toContainEqual(
      expect.objectContaining({ purchaseOrderItemId: 'item-2' }),
    );
  });

  it('acusa SUPPLIER_MISMATCH quando o emitente não é o fornecedor da ordem', () => {
    const result = runThreeWayMatch(
      baseInput({ invoiceIssuerSupplierId: 'supplier-2' }),
    );

    expect(result.divergences).toContainEqual(
      expect.objectContaining({ kind: DivergenceKind.SUPPLIER_MISMATCH }),
    );
  });

  it('acusa TOTAL_MISMATCH quando a soma dos itens diverge do total da nota', () => {
    const result = runThreeWayMatch(
      baseInput({ invoiceTotalCents: 3000000n }),
    );

    expect(result.divergences).toContainEqual(
      expect.objectContaining({ kind: DivergenceKind.TOTAL_MISMATCH }),
    );
  });

  it('acumula múltiplas divergências no mesmo resultado', () => {
    const result = runThreeWayMatch(
      baseInput({
        invoiceIssuerSupplierId: 'supplier-2',
        invoicedItems: [invoiceItem({ unitPriceCents: 999999n })],
        invoiceTotalCents: 9999990n,
      }),
    );

    expect(result.status).toBe(MatchStatus.DIVERGENT);
    expect(result.divergences.length).toBeGreaterThan(1);
  });
});
