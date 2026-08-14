import { ReceiptStatus } from 'generated/prisma/enums';
import {
  findBalanceViolation,
  hasDivergence,
  pendingFor,
  resolveReceiptStatus,
} from './receipt-balance.service';

const item = (
  id: string,
  ordered: string,
  received: string,
  description = 'Notebook',
) => ({ id, description, orderedQuantity: ordered, receivedQuantity: received });

const line = (id: string, quantity: string, rejected = '0.000') => ({
  purchaseOrderItemId: id,
  quantity,
  rejectedQuantity: rejected,
});

describe('pendingFor', () => {
  it('calcula o que ainda falta receber', () => {
    expect(pendingFor(item('a', '10.000', '4.000'))).toBe(6);
  });
});

describe('findBalanceViolation', () => {
  it('não acusa violação quando a quantidade cabe no saldo', () => {
    const violation = findBalanceViolation(
      [item('a', '10.000', '4.000')],
      [line('a', '6.000')],
    );

    expect(violation).toBeNull();
  });

  it('acusa violação quando a quantidade excede o saldo', () => {
    const violation = findBalanceViolation(
      [item('a', '10.000', '8.000')],
      [line('a', '5.000')],
    );

    expect(violation).toEqual({
      description: 'Notebook',
      pending: '2.000',
      informed: '5.000',
    });
  });

  it('ignora linhas que não pertencem à ordem', () => {
    const violation = findBalanceViolation(
      [item('a', '10.000', '0.000')],
      [line('desconhecido', '99.000')],
    );

    expect(violation).toBeNull();
  });
});

describe('resolveReceiptStatus', () => {
  it('marca COMPLETE quando a entrega fecha todos os itens', () => {
    const status = resolveReceiptStatus(
      [item('a', '10.000', '4.000')],
      [line('a', '6.000')],
    );

    expect(status).toBe(ReceiptStatus.COMPLETE);
  });

  it('marca PARTIAL quando ainda falta receber', () => {
    const status = resolveReceiptStatus(
      [item('a', '10.000', '0.000')],
      [line('a', '3.000')],
    );

    expect(status).toBe(ReceiptStatus.PARTIAL);
  });

  it('marca PARTIAL quando um dos itens não veio', () => {
    const status = resolveReceiptStatus(
      [item('a', '10.000', '0.000'), item('b', '5.000', '0.000')],
      [line('a', '10.000')],
    );

    expect(status).toBe(ReceiptStatus.PARTIAL);
  });

  it('marca REJECTED quando tudo foi recusado', () => {
    const status = resolveReceiptStatus(
      [item('a', '10.000', '0.000')],
      [line('a', '0.000', '10.000')],
    );

    expect(status).toBe(ReceiptStatus.REJECTED);
  });
});

describe('hasDivergence', () => {
  it('acusa divergência quando houve recusa', () => {
    expect(hasDivergence([line('a', '8.000', '2.000')])).toBe(true);
  });

  it('não acusa divergência quando nada foi recusado', () => {
    expect(hasDivergence([line('a', '10.000')])).toBe(false);
  });
});
