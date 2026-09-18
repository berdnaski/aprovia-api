import {
  InvoiceParseStatus,
  ServiceInvoiceStatus,
  WithholdingKind,
} from 'generated/prisma/enums';

export class ServiceInvoiceWithholdingEntity {
  id: string;
  serviceInvoiceId: string;
  kind: WithholdingKind;
  baseCents: bigint;
  rate: string;
  amountCents: bigint;
}

export class ServiceInvoiceEntity {
  id: string;
  companyId: string;
  purchaseOrderId: string | null;
  supplierId: string | null;
  payableId: string | null;

  accessKey: string;
  number: string;
  verificationCode: string | null;
  municipalityCode: string | null;
  issuedAt: Date;

  issuerCnpj: string;
  issuerName: string;
  recipientCnpj: string;

  serviceDescription: string;
  serviceCode: string | null;

  grossAmountCents: bigint;
  discountCents: bigint;
  issRate: string | null;
  issAmountCents: bigint;
  issWithheld: boolean;
  netAmountCents: bigint;

  currency: string;
  rawXml: string;

  parseStatus: InvoiceParseStatus;
  parseError: string | null;

  status: ServiceInvoiceStatus;
  integrityWarnings: string[];

  uploadedById: string;
  uploadedAt: Date;

  rejectedById: string | null;
  rejectedAt: Date | null;
  rejectReason: string | null;

  createdAt: Date;
  updatedAt: Date;

  withholdings?: ServiceInvoiceWithholdingEntity[];
}
