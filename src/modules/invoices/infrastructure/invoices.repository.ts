import { Page } from 'src/shared/dto/pagination-query.dto';
import { Injectable } from '@nestjs/common';
import { InvoiceStatus, Prisma } from 'generated/prisma/client';
import { TransactionContext } from 'src/shared/domain/transaction.manager';
import { prismaClient } from 'src/shared/infrastructure/database/prisma-transaction.manager';
import { PrismaService } from 'src/shared/infrastructure/database/prisma.service';
import { InvoiceEntity } from '../domain/invoice.entity';
import {
  CreateInvoiceData,
  IInvoiceRepository,
  ListInvoicesFilter,
} from '../domain/invoices.repository.interface';
import { InvoiceMapper } from './mappers/invoice.mapper';

const INCLUDE = { items: true, taxes: true } as const;

@Injectable()
export class InvoiceRepository implements IInvoiceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateInvoiceData): Promise<InvoiceEntity> {
    const raw = await this.prisma.invoice.create({
      data: {
        company_id: data.companyId,
        purchase_order_id: data.purchaseOrderId,
        supplier_id: data.supplierId,
        access_key: data.accessKey,
        number: data.number,
        series: data.series,
        issued_at: data.issuedAt,
        issuer_cnpj: data.issuerCnpj,
        issuer_name: data.issuerName,
        recipient_cnpj: data.recipientCnpj,
        total_amount_cents: data.totalAmountCents,
        products_amount_cents: data.productsAmountCents,
        freight_cents: data.freightCents,
        insurance_cents: data.insuranceCents,
        discount_cents: data.discountCents,
        raw_xml: data.rawXml,
        parse_status: data.parseStatus,
        authorization_status: data.authorizationStatus,
        protocol_number: data.protocolNumber,
        protocol_status_code: data.protocolStatusCode,
        protocol_reason: data.protocolReason,
        protocol_received_at: data.protocolReceivedAt,
        environment: data.environment,
        integrity_warnings: data.integrityWarnings,
        uploaded_by_id: data.uploadedById,
        items: {
          create: data.items.map((item) => ({
            sequence: item.sequence,
            description: item.description,
            ncm: item.ncm,
            cfop: item.cfop,
            quantity: item.quantity,
            unit: item.unit,
            unit_price_cents: item.unitPriceCents,
            total_cents: item.totalCents,
            purchase_order_item_id: item.purchaseOrderItemId,
          })),
        },
        taxes: {
          create: data.taxes.map((tax) => ({
            kind: tax.kind,
            base_cents: tax.baseCents,
            rate: tax.rate,
            amount_cents: tax.amountCents,
          })),
        },
      },
      include: INCLUDE,
    });

    return InvoiceMapper.toDomain(raw);
  }

  async findById(id: string, companyId: string): Promise<InvoiceEntity | null> {
    const raw = await this.prisma.invoice.findFirst({
      where: { id, company_id: companyId },
      include: INCLUDE,
    });

    return raw ? InvoiceMapper.toDomain(raw) : null;
  }

  async findByAccessKey(
    companyId: string,
    accessKey: string,
  ): Promise<InvoiceEntity | null> {
    const raw = await this.prisma.invoice.findUnique({
      where: {
        company_id_access_key: { company_id: companyId, access_key: accessKey },
      },
      include: INCLUDE,
    });

    return raw ? InvoiceMapper.toDomain(raw) : null;
  }

  async list(filter: ListInvoicesFilter): Promise<Page<InvoiceEntity>> {
    const where: Prisma.InvoiceWhereInput = {
      company_id: filter.companyId,
      ...(filter.status?.length && { status: { in: filter.status } }),
      ...(filter.supplierId && { supplier_id: filter.supplierId }),
      ...(filter.unlinkedOnly && { purchase_order_id: null }),
      ...(filter.search && {
        number: { contains: filter.search, mode: 'insensitive' as const },
      }),
    };

    const [rows, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        include: INCLUDE,
        orderBy: { issued_at: 'desc' },
        skip: filter.skip,
        take: filter.take,
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return {
      items: rows.map(InvoiceMapper.toDomain),
      total,
      page: filter.page,
      perPage: filter.perPage,
    };
  }

  async listByOrder(purchaseOrderId: string): Promise<InvoiceEntity[]> {
    const rows = await this.prisma.invoice.findMany({
      where: { purchase_order_id: purchaseOrderId },
      include: INCLUDE,
      orderBy: { uploaded_at: 'desc' },
    });

    return rows.map(InvoiceMapper.toDomain);
  }

  async updateStatus(
    id: string,
    status: InvoiceStatus,
    context?: TransactionContext,
  ): Promise<InvoiceEntity> {
    const raw = await prismaClient(this.prisma, context).invoice.update({
      where: { id },
      data: { status },
      include: INCLUDE,
    });

    return InvoiceMapper.toDomain(raw);
  }

  async linkToOrder(
    id: string,
    purchaseOrderId: string,
    supplierId: string,
  ): Promise<InvoiceEntity> {
    const raw = await this.prisma.invoice.update({
      where: { id },
      data: { purchase_order_id: purchaseOrderId, supplier_id: supplierId },
      include: INCLUDE,
    });

    return InvoiceMapper.toDomain(raw);
  }

  async reject(
    id: string,
    rejectedById: string,
    reason: string,
  ): Promise<InvoiceEntity> {
    const raw = await this.prisma.invoice.update({
      where: { id },
      data: {
        status: InvoiceStatus.REJECTED,
        rejected_by_id: rejectedById,
        rejected_at: new Date(),
        reject_reason: reason,
      },
      include: INCLUDE,
    });

    return InvoiceMapper.toDomain(raw);
  }
}
