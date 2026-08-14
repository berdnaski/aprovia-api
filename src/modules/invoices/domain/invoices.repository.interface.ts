import { InvoiceParseStatus, InvoiceStatus, TaxKind } from 'generated/prisma/enums';
import { TransactionContext } from 'src/shared/domain/transaction.manager';
import { InvoiceEntity } from './invoice.entity';

export interface CreateInvoiceItemData {
  sequence: number;
  description: string;
  ncm: string | null;
  cfop: string | null;
  quantity: string;
  unit: string;
  unitPriceCents: bigint;
  totalCents: bigint;
}

export interface CreateInvoiceTaxData {
  kind: TaxKind;
  baseCents: bigint;
  rate: string;
  amountCents: bigint;
}

export interface CreateInvoiceData {
  companyId: string;
  purchaseOrderId: string | null;
  supplierId: string | null;
  accessKey: string;
  number: string;
  series: string | null;
  issuedAt: Date;
  issuerCnpj: string;
  issuerName: string;
  recipientCnpj: string;
  totalAmountCents: bigint;
  productsAmountCents: bigint;
  freightCents: bigint;
  insuranceCents: bigint;
  discountCents: bigint;
  rawXml: string;
  parseStatus: InvoiceParseStatus;
  uploadedById: string;
  items: CreateInvoiceItemData[];
  taxes: CreateInvoiceTaxData[];
}

export abstract class IInvoiceRepository {
  abstract create(data: CreateInvoiceData): Promise<InvoiceEntity>;

  abstract findById(
    id: string,
    companyId: string,
  ): Promise<InvoiceEntity | null>;

  abstract findByAccessKey(
    companyId: string,
    accessKey: string,
  ): Promise<InvoiceEntity | null>;

  abstract listByOrder(purchaseOrderId: string): Promise<InvoiceEntity[]>;

  abstract updateStatus(
    id: string,
    status: InvoiceStatus,
    context?: TransactionContext,
  ): Promise<InvoiceEntity>;

  abstract linkToOrder(
    id: string,
    purchaseOrderId: string,
    supplierId: string,
  ): Promise<InvoiceEntity>;

  abstract reject(
    id: string,
    rejectedById: string,
    reason: string,
  ): Promise<InvoiceEntity>;
}
