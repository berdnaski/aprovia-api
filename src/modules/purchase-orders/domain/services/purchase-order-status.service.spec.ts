import { PurchaseOrderStatus } from 'generated/prisma/enums';
import {
  pendingQuantity,
  resolveStatusAfterReceipt,
} from './purchase-order-status.service';

describe('resolveStatusAfterReceipt', () => {
  it('marca como RECEIVED quando todos os itens chegaram por completo', () => {
    const status = resolveStatusAfterReceipt([
      { orderedQuantity: '10.000', receivedQuantity: '10.000' },
      { orderedQuantity: '5.000', receivedQuantity: '5.000' },
    ]);

    expect(status).toBe(PurchaseOrderStatus.RECEIVED);
  });

  it('marca como PARTIALLY_RECEIVED quando parte chegou', () => {
    const status = resolveStatusAfterReceipt([
      { orderedQuantity: '10.000', receivedQuantity: '8.000' },
      { orderedQuantity: '5.000', receivedQuantity: '0.000' },
    ]);

    expect(status).toBe(PurchaseOrderStatus.PARTIALLY_RECEIVED);
  });

  it('mantém ISSUED enquanto nada chegou', () => {
    const status = resolveStatusAfterReceipt([
      { orderedQuantity: '10.000', receivedQuantity: '0.000' },
    ]);

    expect(status).toBe(PurchaseOrderStatus.ISSUED);
  });

  it('considera recebido quando a quantidade excede o pedido', () => {
    const status = resolveStatusAfterReceipt([
      { orderedQuantity: '10.000', receivedQuantity: '10.500' },
    ]);

    expect(status).toBe(PurchaseOrderStatus.RECEIVED);
  });

  it('calcula o saldo pendente do item', () => {
    expect(
      pendingQuantity({ orderedQuantity: '10.000', receivedQuantity: '3.500' }),
    ).toBe('6.500');
  });

  it('nunca devolve saldo pendente negativo', () => {
    expect(
      pendingQuantity({ orderedQuantity: '10.000', receivedQuantity: '12.000' }),
    ).toBe('0.000');
  });
});
