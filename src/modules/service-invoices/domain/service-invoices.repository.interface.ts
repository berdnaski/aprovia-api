import {
  InvoiceParseStatus,
  ServiceInvoiceStatus,
  WithholdingKind,
} from 'generated/prisma/enums';
import { Page } from 'src/shared/dto/pagination-query.dto';
import { ServiceInvoiceEntity } from './service-invoice.entity';

export interface ListServiceInvoicesFilter {
  companyId: string;
  status?: ServiceInvoiceStatus[];
  supplierId?: string;
  search?: string;
  skip: number;
  take: number;
  page: number;
  perPage: number;
}

export interface CreateServiceInvoiceWithholdingData {
  kind: WithholdingKind;
  baseCents: bigint;
  rate: string;
  amountCents: bigint;
}

export interface CreateServiceInvoiceData {
  companyId: string;
  supplierId: string | null;
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
  rawXml: string;
  parseStatus: InvoiceParseStatus;
  integrityWarnings: string[];
  uploadedById: string;
  withholdings: CreateServiceInvoiceWithholdingData[];
}

export abstract class IServiceInvoiceRepository {
  abstract create(
    data: CreateServiceInvoiceData,
  ): Promise<ServiceInvoiceEntity>;

  abstract findById(
    id: string,
    companyId: string,
  ): Promise<ServiceInvoiceEntity | null>;

  abstract findByAccessKey(
    companyId: string,
    accessKey: string,
  ): Promise<ServiceInvoiceEntity | null>;

  abstract list(
    filter: ListServiceInvoicesFilter,
  ): Promise<Page<ServiceInvoiceEntity>>;

  abstract approve(
    id: string,
    payableId: string,
  ): Promise<ServiceInvoiceEntity>;

  abstract reject(
    id: string,
    rejectedById: string,
    reason: string,
  ): Promise<ServiceInvoiceEntity>;
}
