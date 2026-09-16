import { CompanyMemberRole, InvoiceStatus } from 'generated/prisma/enums';
import { IAuditLogRepository } from 'src/modules/audit/domain/audit-logs.repository.interface';
import { FindPurchaseOrderByIdUseCase } from 'src/modules/purchase-orders/application/find-purchase-order-by-id.use-case';
import { PurchaseOrderEntity } from 'src/modules/purchase-orders/domain/purchase-order.entity';
import { InvoiceEntity } from '../domain/invoice.entity';
import { InvoiceAlreadyResolvedError } from '../domain/invoices.errors';
import { IInvoiceRepository } from '../domain/invoices.repository.interface';
import { FindInvoiceByIdUseCase } from './find-invoice-by-id.use-case';
import { LinkInvoiceToOrderUseCase } from './link-invoice-to-order.use-case';

const actor = {
  memberId: 'member-1',
  userId: 'user-1',
  companyId: 'company-1',
  role: CompanyMemberRole.FINANCE_ADMIN,
};

const invoiceOf = (status: InvoiceStatus) =>
  ({
    id: 'invoice-1',
    number: '48213',
    status,
    items: [
      {
        id: 'invoice-item-1',
        sequence: 1,
        description: 'Licença de conciliação bancária - 12 meses',
      },
      {
        id: 'invoice-item-2',
        sequence: 2,
        description: 'Implantação e integração bancária',
      },
      { id: 'invoice-item-3', sequence: 3, description: 'Frete expresso' },
    ],
  }) as InvoiceEntity;

const order = {
  id: 'order-1',
  number: 'PO-2026-0017',
  supplierId: 'supplier-1',
  items: [
    {
      id: 'order-item-setup',
      description: 'Implantação e integração bancária',
    },
    {
      id: 'order-item-license',
      description: 'Licença de conciliação bancária - 12 meses',
    },
  ],
} as PurchaseOrderEntity;

function build(invoice: InvoiceEntity) {
  const linkToOrder = jest.fn().mockResolvedValue(invoice);
  const useCase = new LinkInvoiceToOrderUseCase(
    { linkToOrder } as unknown as IInvoiceRepository,
    {
      execute: jest.fn().mockResolvedValue(invoice),
    } as unknown as FindInvoiceByIdUseCase,
    {
      execute: jest.fn().mockResolvedValue(order),
    } as unknown as FindPurchaseOrderByIdUseCase,
    {
      record: jest.fn().mockResolvedValue(undefined),
    } as unknown as IAuditLogRepository,
  );

  return { useCase, linkToOrder };
}

describe('LinkInvoiceToOrderUseCase', () => {
  it('liga cada item da nota ao item da ordem com a mesma descrição', async () => {
    const { useCase, linkToOrder } = build(invoiceOf(InvoiceStatus.RECEIVED));

    await useCase.execute('invoice-1', 'order-1', actor);

    expect(linkToOrder).toHaveBeenCalledWith(
      'invoice-1',
      'order-1',
      'supplier-1',
      [
        {
          invoiceItemId: 'invoice-item-1',
          purchaseOrderItemId: 'order-item-license',
        },
        {
          invoiceItemId: 'invoice-item-2',
          purchaseOrderItemId: 'order-item-setup',
        },
        { invoiceItemId: 'invoice-item-3', purchaseOrderItemId: null },
      ],
    );
  });

  it('não mexe em nota que já foi conferida', async () => {
    const { useCase, linkToOrder } = build(invoiceOf(InvoiceStatus.MATCHED));

    await expect(
      useCase.execute('invoice-1', 'order-1', actor),
    ).rejects.toBeInstanceOf(InvoiceAlreadyResolvedError);
    expect(linkToOrder).not.toHaveBeenCalled();
  });
});
