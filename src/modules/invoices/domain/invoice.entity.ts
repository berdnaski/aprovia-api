import { NfeAuthorizationStatus, NfeEnvironment } from 'generated/prisma/enums';
import {
  InvoiceParseStatus,
  InvoiceStatus,
  TaxKind,
} from 'generated/prisma/enums';

export class InvoiceTaxEntity {
  id: string;
  invoiceId: string;
  kind: TaxKind;
  baseCents: bigint;
  rate: string;
  amountCents: bigint;
  withheld: boolean;
}

export class InvoiceItemEntity {
  id: string;
  invoiceId: string;
  purchaseOrderItemId: string | null;
  sequence: number;
  description: string;
  ncm: string | null;
  cfop: string | null;
  quantity: string;
  unit: string;
  unitPriceCents: bigint;
  totalCents: bigint;
}

export class InvoiceEntity {
  id: string;
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
  currency: string;
  rawXml: string;
  authorizationStatus: NfeAuthorizationStatus;
  protocolNumber: string | null;
  protocolStatusCode: string | null;
  protocolReason: string | null;
  protocolReceivedAt: Date | null;
  environment: NfeEnvironment | null;
  integrityWarnings: string[];
  parseStatus: InvoiceParseStatus;
  parseError: string | null;
  status: InvoiceStatus;
  uploadedById: string;
  uploadedAt: Date;
  rejectedById: string | null;
  rejectedAt: Date | null;
  rejectReason: string | null;
  createdAt: Date;
  updatedAt: Date;
  items?: InvoiceItemEntity[];
  taxes?: InvoiceTaxEntity[];
}
