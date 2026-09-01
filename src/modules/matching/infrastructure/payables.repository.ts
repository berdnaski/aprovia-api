import { Injectable } from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { PayableStatus } from 'generated/prisma/enums';
import { Page } from 'src/shared/dto/pagination-query.dto';
import { PrismaService } from 'src/shared/infrastructure/database/prisma.service';
import { PayableEntity } from '../domain/payable.entity';
import {
  CreatePayableData,
  IPayableRepository,
  ListPayablesFilter,
  ReleasePayableData,
} from '../domain/payables.repository.interface';
import { PayableMapper } from './mappers/payable.mapper';

@Injectable()
export class PayableRepository implements IPayableRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreatePayableData): Promise<PayableEntity> {
    const raw = await this.prisma.payable.create({
      data: {
        company_id: data.companyId,
        invoice_id: data.invoiceId,
        supplier_id: data.supplierId,
        amount_cents: data.amountCents,
        due_date: data.dueDate,
        ...(data.status && { status: data.status }),
        ...(data.releaseReason && { release_reason: data.releaseReason }),
        ...(data.releasedById && {
          released_by_id: data.releasedById,
          released_at: new Date(),
        }),
        ...(data.releaseNote && { release_note: data.releaseNote }),
      },
    });

    return PayableMapper.toDomain(raw);
  }

  async findById(id: string, companyId: string): Promise<PayableEntity | null> {
    const raw = await this.prisma.payable.findFirst({
      where: { id, company_id: companyId },
    });

    return raw ? PayableMapper.toDomain(raw) : null;
  }

  async findByInvoiceId(invoiceId: string): Promise<PayableEntity | null> {
    const raw = await this.prisma.payable.findUnique({
      where: { invoice_id: invoiceId },
    });

    return raw ? PayableMapper.toDomain(raw) : null;
  }

  async list(filter: ListPayablesFilter): Promise<Page<PayableEntity>> {
    const where: Prisma.PayableWhereInput = {
      company_id: filter.companyId,
      ...(filter.status?.length && { status: { in: filter.status } }),
      ...(filter.supplierId && { supplier_id: filter.supplierId }),
    };

    const [rows, total] = await Promise.all([
      this.prisma.payable.findMany({
        where,
        orderBy: { due_date: 'asc' },
        skip: filter.skip,
        take: filter.take,
      }),
      this.prisma.payable.count({ where }),
    ]);

    return {
      items: rows.map(PayableMapper.toDomain),
      total,
      page: filter.page,
      perPage: filter.perPage,
    };
  }

  async release(id: string, data: ReleasePayableData): Promise<PayableEntity> {
    const raw = await this.prisma.payable.update({
      where: { id },
      data: {
        status: PayableStatus.RELEASED,
        release_reason: data.releaseReason,
        released_by_id: data.releasedById,
        released_at: new Date(),
        proof_storage_key: data.proofStorageKey,
        release_note: data.releaseNote,
      },
    });

    return PayableMapper.toDomain(raw);
  }

  async markAsPaid(id: string): Promise<PayableEntity> {
    const raw = await this.prisma.payable.update({
      where: { id },
      data: { status: PayableStatus.PAID, paid_at: new Date() },
    });

    return PayableMapper.toDomain(raw);
  }
}
