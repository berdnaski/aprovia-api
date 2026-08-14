import { Injectable } from '@nestjs/common';
import { TransactionContext } from 'src/shared/domain/transaction.manager';
import { prismaClient } from 'src/shared/infrastructure/database/prisma-transaction.manager';
import { PrismaService } from 'src/shared/infrastructure/database/prisma.service';
import { ReceiptEntity } from '../domain/receipt.entity';
import {
  CreateReceiptData,
  IReceiptRepository,
} from '../domain/receipts.repository.interface';
import { ReceiptMapper } from './mappers/receipt.mapper';

@Injectable()
export class ReceiptRepository implements IReceiptRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: CreateReceiptData,
    context?: TransactionContext,
  ): Promise<ReceiptEntity> {
    const raw = await prismaClient(this.prisma, context).receipt.create({
      data: {
        company_id: data.companyId,
        number: data.number,
        purchase_order_id: data.purchaseOrderId,
        received_by_id: data.receivedById,
        received_at: data.receivedAt,
        status: data.status,
        has_divergence: data.hasDivergence,
        notes: data.notes,
        items: {
          create: data.items.map((item) => ({
            purchase_order_item_id: item.purchaseOrderItemId,
            quantity: item.quantity,
            rejected_quantity: item.rejectedQuantity,
            rejection_reason: item.rejectionReason,
          })),
        },
      },
      include: { items: true },
    });

    return ReceiptMapper.toDomain(raw);
  }

  async findById(id: string, companyId: string): Promise<ReceiptEntity | null> {
    const raw = await this.prisma.receipt.findFirst({
      where: { id, company_id: companyId },
      include: { items: true },
    });

    return raw ? ReceiptMapper.toDomain(raw) : null;
  }

  async listByOrder(purchaseOrderId: string): Promise<ReceiptEntity[]> {
    const rows = await this.prisma.receipt.findMany({
      where: { purchase_order_id: purchaseOrderId },
      include: { items: true },
      orderBy: { received_at: 'desc' },
    });

    return rows.map(ReceiptMapper.toDomain);
  }

  async findLastNumber(
    companyId: string,
    prefix: string,
    context?: TransactionContext,
  ): Promise<string | null> {
    const raw = await prismaClient(this.prisma, context).receipt.findFirst({
      where: { company_id: companyId, number: { startsWith: prefix } },
      orderBy: { number: 'desc' },
      select: { number: true },
    });

    return raw?.number ?? null;
  }

  async lockOrderItems(
    purchaseOrderId: string,
    context: TransactionContext,
  ): Promise<void> {
    await prismaClient(this.prisma, context).$queryRaw`
      SELECT id FROM purchase_order_items
      WHERE purchase_order_id = ${purchaseOrderId}
      FOR UPDATE
    `;
  }

  async incrementReceivedQuantity(
    purchaseOrderItemId: string,
    quantity: string,
    context: TransactionContext,
  ): Promise<void> {
    await prismaClient(this.prisma, context).purchaseOrderItem.update({
      where: { id: purchaseOrderItemId },
      data: { received_quantity: { increment: quantity } },
    });
  }

  async sumReceivedAmountCents(purchaseOrderId: string): Promise<bigint> {
    const rows = await this.prisma.receiptItem.findMany({
      where: { receipt: { purchase_order_id: purchaseOrderId } },
      select: {
        quantity: true,
        purchase_order_item: { select: { unit_price_cents: true } },
      },
    });

    return rows.reduce((total, row) => {
      const quantity = Number(row.quantity);
      const unitPrice = row.purchase_order_item.unit_price_cents;

      return total + BigInt(Math.round(quantity * Number(unitPrice)));
    }, 0n);
  }
}
