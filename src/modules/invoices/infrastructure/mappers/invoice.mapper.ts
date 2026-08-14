import {
  InvoiceItemModel as PrismaInvoiceItem,
  InvoiceModel as PrismaInvoice,
  InvoiceTaxModel as PrismaInvoiceTax,
} from 'generated/prisma/models';
import {
  InvoiceEntity,
  InvoiceItemEntity,
  InvoiceTaxEntity,
} from '../../domain/invoice.entity';

export class InvoiceItemMapper {
  static toDomain(this: void, raw: PrismaInvoiceItem): InvoiceItemEntity {
    const entity = new InvoiceItemEntity();

    entity.id = raw.id;
    entity.invoiceId = raw.invoice_id;
    entity.purchaseOrderItemId = raw.purchase_order_item_id;
    entity.sequence = raw.sequence;
    entity.description = raw.description;
    entity.ncm = raw.ncm;
    entity.cfop = raw.cfop;
    entity.quantity = raw.quantity.toString();
    entity.unit = raw.unit;
    entity.unitPriceCents = raw.unit_price_cents;
    entity.totalCents = raw.total_cents;

    return entity;
  }
}

export class InvoiceTaxMapper {
  static toDomain(this: void, raw: PrismaInvoiceTax): InvoiceTaxEntity {
    const entity = new InvoiceTaxEntity();

    entity.id = raw.id;
    entity.invoiceId = raw.invoice_id;
    entity.kind = raw.kind;
    entity.baseCents = raw.base_cents;
    entity.rate = raw.rate.toString();
    entity.amountCents = raw.amount_cents;
    entity.withheld = raw.withheld;

    return entity;
  }
}

export class InvoiceMapper {
  static toDomain(
    this: void,
    raw: PrismaInvoice & {
      items?: PrismaInvoiceItem[];
      taxes?: PrismaInvoiceTax[];
    },
  ): InvoiceEntity {
    const entity = new InvoiceEntity();

    entity.id = raw.id;
    entity.companyId = raw.company_id;
    entity.purchaseOrderId = raw.purchase_order_id;
    entity.supplierId = raw.supplier_id;
    entity.accessKey = raw.access_key;
    entity.number = raw.number;
    entity.series = raw.series;
    entity.issuedAt = raw.issued_at;
    entity.issuerCnpj = raw.issuer_cnpj;
    entity.issuerName = raw.issuer_name;
    entity.recipientCnpj = raw.recipient_cnpj;
    entity.totalAmountCents = raw.total_amount_cents;
    entity.productsAmountCents = raw.products_amount_cents;
    entity.freightCents = raw.freight_cents;
    entity.insuranceCents = raw.insurance_cents;
    entity.discountCents = raw.discount_cents;
    entity.currency = raw.currency;
    entity.rawXml = raw.raw_xml;
    entity.parseStatus = raw.parse_status;
    entity.parseError = raw.parse_error;
    entity.status = raw.status;
    entity.uploadedById = raw.uploaded_by_id;
    entity.uploadedAt = raw.uploaded_at;
    entity.rejectedById = raw.rejected_by_id;
    entity.rejectedAt = raw.rejected_at;
    entity.rejectReason = raw.reject_reason;
    entity.createdAt = raw.created_at;
    entity.updatedAt = raw.updated_at;

    if (raw.items) {
      entity.items = raw.items.map(InvoiceItemMapper.toDomain);
    }

    if (raw.taxes) {
      entity.taxes = raw.taxes.map(InvoiceTaxMapper.toDomain);
    }

    return entity;
  }
}
