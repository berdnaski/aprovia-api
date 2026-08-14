import { Injectable } from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { PurchaseOrderStatus } from 'generated/prisma/enums';
import { TransactionContext } from 'src/shared/domain/transaction.manager';
import { Page } from 'src/shared/dto/pagination-query.dto';
import { prismaClient } from 'src/shared/infrastructure/database/prisma-transaction.manager';
import { PrismaService } from 'src/shared/infrastructure/database/prisma.service';
import {
  PurchaseOrderEntity,
  PurchaseOrderItemEntity,
} from '../domain/purchase-order.entity';
import {
  CreatePurchaseOrderData,
  IPurchaseOrderRepository,
  ListPurchaseOrdersFilter,
} from '../domain/purchase-orders.repository.interface';
import {
  PurchaseOrderItemMapper,
  PurchaseOrderMapper,
} from './mappers/purchase-order.mapper';

@Injectable()
export class PurchaseOrderRepository implements IPurchaseOrderRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: CreatePurchaseOrderData,
    context?: TransactionContext,
  ): Promise<PurchaseOrderEntity> {
    const raw = await prismaClient(this.prisma, context).purchaseOrder.create({
      data: {
        company_id: data.companyId,
        number: data.number,
        purchase_request_id: data.purchaseRequestId,
        supplier_id: data.supplierId,
        total_amount_cents: data.totalAmountCents,
        issued_by_id: data.issuedById,
        expected_delivery_at: data.expectedDeliveryAt,
        delivery_address: data.deliveryAddress,
        payment_terms: data.paymentTerms,
        notes: data.notes,
        items: {
          create: data.items.map((item) => ({
            request_item_id: item.requestItemId,
            description: item.description,
            quantity: item.quantity,
            unit: item.unit,
            unit_price_cents: item.unitPriceCents,
            total_cents: item.totalCents,
          })),
        },
      },
      include: { items: true },
    });

    return PurchaseOrderMapper.toDomain(raw);
  }

  async findById(
    id: string,
    companyId: string,
    context?: TransactionContext,
  ): Promise<PurchaseOrderEntity | null> {
    const raw = await prismaClient(
      this.prisma,
      context,
    ).purchaseOrder.findFirst({
      where: { id, company_id: companyId },
      include: { items: true },
    });

    return raw ? PurchaseOrderMapper.toDomain(raw) : null;
  }

  async findByRequestId(
    purchaseRequestId: string,
  ): Promise<PurchaseOrderEntity | null> {
    const raw = await this.prisma.purchaseOrder.findUnique({
      where: { purchase_request_id: purchaseRequestId },
      include: { items: true },
    });

    return raw ? PurchaseOrderMapper.toDomain(raw) : null;
  }

  async findLastNumber(
    companyId: string,
    prefix: string,
    context?: TransactionContext,
  ): Promise<string | null> {
    const raw = await prismaClient(
      this.prisma,
      context,
    ).purchaseOrder.findFirst({
      where: { company_id: companyId, number: { startsWith: prefix } },
      orderBy: { number: 'desc' },
      select: { number: true },
    });

    return raw?.number ?? null;
  }

  async list(
    filter: ListPurchaseOrdersFilter,
  ): Promise<Page<PurchaseOrderEntity>> {
    const where = this.buildWhere(filter);

    const [rows, total] = await Promise.all([
      this.prisma.purchaseOrder.findMany({
        where,
        include: { items: true },
        orderBy: { issued_at: 'desc' },
        skip: filter.skip,
        take: filter.take,
      }),
      this.prisma.purchaseOrder.count({ where }),
    ]);

    return {
      items: rows.map(PurchaseOrderMapper.toDomain),
      total,
      page: filter.page,
      perPage: filter.perPage,
    };
  }

  async listItems(
    purchaseOrderId: string,
    context?: TransactionContext,
  ): Promise<PurchaseOrderItemEntity[]> {
    const rows = await prismaClient(
      this.prisma,
      context,
    ).purchaseOrderItem.findMany({
      where: { purchase_order_id: purchaseOrderId },
      orderBy: { created_at: 'asc' },
    });

    return rows.map(PurchaseOrderItemMapper.toDomain);
  }

  async updateStatus(
    id: string,
    status: PurchaseOrderStatus,
    context?: TransactionContext,
  ): Promise<PurchaseOrderEntity> {
    const raw = await prismaClient(this.prisma, context).purchaseOrder.update({
      where: { id },
      data: { status },
      include: { items: true },
    });

    return PurchaseOrderMapper.toDomain(raw);
  }

  async markAsSent(id: string, sentAt: Date): Promise<PurchaseOrderEntity> {
    const raw = await this.prisma.purchaseOrder.update({
      where: { id },
      data: { status: PurchaseOrderStatus.SENT, sent_to_supplier_at: sentAt },
      include: { items: true },
    });

    return PurchaseOrderMapper.toDomain(raw);
  }

  async cancel(
    id: string,
    canceledById: string,
    reason: string,
  ): Promise<PurchaseOrderEntity> {
    const raw = await this.prisma.purchaseOrder.update({
      where: { id },
      data: {
        status: PurchaseOrderStatus.CANCELED,
        canceled_by_id: canceledById,
        canceled_at: new Date(),
        cancel_reason: reason,
      },
      include: { items: true },
    });

    return PurchaseOrderMapper.toDomain(raw);
  }

  async countReceipts(purchaseOrderId: string): Promise<number> {
    return this.prisma.receipt.count({
      where: { purchase_order_id: purchaseOrderId },
    });
  }

  private buildWhere(
    filter: ListPurchaseOrdersFilter,
  ): Prisma.PurchaseOrderWhereInput {
    const where: Prisma.PurchaseOrderWhereInput = {
      company_id: filter.companyId,
    };

    if (filter.status?.length) {
      where.status = { in: filter.status };
    }

    if (filter.supplierId) {
      where.supplier_id = filter.supplierId;
    }

    if (filter.search) {
      where.OR = [
        { number: { contains: filter.search, mode: 'insensitive' } },
        {
          purchase_request: {
            title: { contains: filter.search, mode: 'insensitive' },
          },
        },
      ];
    }

    return where;
  }
}
