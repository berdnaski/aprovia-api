import { Injectable } from '@nestjs/common';
import { TransactionContext } from 'src/shared/domain/transaction.manager';
import { prismaClient } from 'src/shared/infrastructure/database/prisma-transaction.manager';
import { PrismaService } from 'src/shared/infrastructure/database/prisma.service';
import { RequestItemEntity } from '../domain/request-item.entity';
import {
  CreateRequestItemData,
  IRequestItemRepository,
  UpdateRequestItemData,
} from '../domain/request-items.repository.interface';
import { RequestItemMapper } from './mappers/purchase-request.mapper';

@Injectable()
export class RequestItemRepository implements IRequestItemRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: CreateRequestItemData,
    context?: TransactionContext,
  ): Promise<RequestItemEntity> {
    const raw = await prismaClient(this.prisma, context).requestItem.create({
      data: {
        purchase_request_id: data.purchaseRequestId,
        description: data.description,
        quantity: data.quantity,
        unit: data.unit,
        unit_price_cents: data.unitPriceCents,
        total_cents: data.totalCents,
      },
    });

    return RequestItemMapper.toDomain(raw);
  }

  async createMany(
    items: CreateRequestItemData[],
    context?: TransactionContext,
  ): Promise<void> {
    if (items.length === 0) {
      return;
    }

    await prismaClient(this.prisma, context).requestItem.createMany({
      data: items.map((item) => ({
        purchase_request_id: item.purchaseRequestId,
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        unit_price_cents: item.unitPriceCents,
        total_cents: item.totalCents,
      })),
    });
  }

  async findById(
    id: string,
    context?: TransactionContext,
  ): Promise<RequestItemEntity | null> {
    const raw = await prismaClient(this.prisma, context).requestItem.findUnique(
      { where: { id } },
    );

    return raw ? RequestItemMapper.toDomain(raw) : null;
  }

  async listByRequest(
    purchaseRequestId: string,
    context?: TransactionContext,
  ): Promise<RequestItemEntity[]> {
    const records = await prismaClient(
      this.prisma,
      context,
    ).requestItem.findMany({
      where: { purchase_request_id: purchaseRequestId },
      orderBy: { created_at: 'asc' },
    });

    return records.map(RequestItemMapper.toDomain);
  }

  async update(
    id: string,
    data: UpdateRequestItemData,
    context?: TransactionContext,
  ): Promise<RequestItemEntity> {
    const raw = await prismaClient(this.prisma, context).requestItem.update({
      where: { id },
      data: {
        description: data.description,
        quantity: data.quantity,
        unit: data.unit,
        unit_price_cents: data.unitPriceCents,
        total_cents: data.totalCents,
      },
    });

    return RequestItemMapper.toDomain(raw);
  }

  async delete(id: string, context?: TransactionContext): Promise<void> {
    await prismaClient(this.prisma, context).requestItem.delete({
      where: { id },
    });
  }

  async sumTotal(
    purchaseRequestId: string,
    context?: TransactionContext,
  ): Promise<bigint> {
    const result = await prismaClient(
      this.prisma,
      context,
    ).requestItem.aggregate({
      where: { purchase_request_id: purchaseRequestId },
      _sum: { total_cents: true },
    });

    return result._sum.total_cents ?? 0n;
  }
}
