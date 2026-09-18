import {
  ServiceInvoiceModel as PrismaServiceInvoice,
  ServiceInvoiceWithholdingModel as PrismaServiceInvoiceWithholding,
} from 'generated/prisma/models';
import {
  ServiceInvoiceEntity,
  ServiceInvoiceWithholdingEntity,
} from '../../domain/service-invoice.entity';

export class ServiceInvoiceWithholdingMapper {
  static toDomain(
    this: void,
    raw: PrismaServiceInvoiceWithholding,
  ): ServiceInvoiceWithholdingEntity {
    const entity = new ServiceInvoiceWithholdingEntity();

    entity.id = raw.id;
    entity.serviceInvoiceId = raw.service_invoice_id;
    entity.kind = raw.kind;
    entity.baseCents = raw.base_cents;
    entity.rate = raw.rate.toString();
    entity.amountCents = raw.amount_cents;

    return entity;
  }
}

export class ServiceInvoiceMapper {
  static toDomain(
    this: void,
    raw: Omit<PrismaServiceInvoice, 'raw_xml'> & {
      raw_xml?: string;
      withholdings?: PrismaServiceInvoiceWithholding[];
    },
  ): ServiceInvoiceEntity {
    const entity = new ServiceInvoiceEntity();

    entity.id = raw.id;
    entity.companyId = raw.company_id;
    entity.purchaseOrderId = raw.purchase_order_id;
    entity.supplierId = raw.supplier_id;
    entity.payableId = raw.payable_id;

    entity.accessKey = raw.access_key;
    entity.number = raw.number;
    entity.verificationCode = raw.verification_code;
    entity.municipalityCode = raw.municipality_code;
    entity.issuedAt = raw.issued_at;

    entity.issuerCnpj = raw.issuer_cnpj;
    entity.issuerName = raw.issuer_name;
    entity.recipientCnpj = raw.recipient_cnpj;

    entity.serviceDescription = raw.service_description;
    entity.serviceCode = raw.service_code;

    entity.grossAmountCents = raw.gross_amount_cents;
    entity.discountCents = raw.discount_cents;
    entity.issRate = raw.iss_rate;
    entity.issAmountCents = raw.iss_amount_cents;
    entity.issWithheld = raw.iss_withheld;
    entity.netAmountCents = raw.net_amount_cents;

    entity.currency = raw.currency;
    // Omitido nas consultas de listagem (não é serializado em nenhuma resposta
    // de lista) — só vem preenchido quando a query pede o campo explicitamente.
    entity.rawXml = raw.raw_xml ?? '';

    entity.parseStatus = raw.parse_status;
    entity.parseError = raw.parse_error;

    entity.status = raw.status;
    entity.integrityWarnings = raw.integrity_warnings;

    entity.uploadedById = raw.uploaded_by_id;
    entity.uploadedAt = raw.uploaded_at;

    entity.rejectedById = raw.rejected_by_id;
    entity.rejectedAt = raw.rejected_at;
    entity.rejectReason = raw.reject_reason;

    entity.createdAt = raw.created_at;
    entity.updatedAt = raw.updated_at;

    if (raw.withholdings) {
      entity.withholdings = raw.withholdings.map(
        ServiceInvoiceWithholdingMapper.toDomain,
      );
    }

    return entity;
  }
}
