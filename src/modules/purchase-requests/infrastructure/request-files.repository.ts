import { Injectable } from '@nestjs/common';
import { TransactionContext } from 'src/shared/domain/transaction.manager';
import { prismaClient } from 'src/shared/infrastructure/database/prisma-transaction.manager';
import { PrismaService } from 'src/shared/infrastructure/database/prisma.service';
import { RequestFileEntity } from '../domain/request-file.entity';
import {
  CreateRequestFileData,
  IRequestFileRepository,
} from '../domain/request-files.repository.interface';
import { RequestFileMapper } from './mappers/purchase-request.mapper';

@Injectable()
export class RequestFileRepository implements IRequestFileRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: CreateRequestFileData,
    context?: TransactionContext,
  ): Promise<RequestFileEntity> {
    const raw = await prismaClient(this.prisma, context).file.create({
      data: {
        company_id: data.companyId,
        type: data.type,
        purchase_request_id: data.purchaseRequestId,
        file_name: data.fileName,
        mime_type: data.mimeType,
        size_bytes: data.sizeBytes,
        storage_key: data.storageKey,
        uploaded_by_id: data.uploadedById,
      },
    });

    return RequestFileMapper.toDomain(raw);
  }

  async findById(id: string): Promise<RequestFileEntity | null> {
    const raw = await this.prisma.file.findUnique({ where: { id } });

    return raw ? RequestFileMapper.toDomain(raw) : null;
  }

  async listByRequest(purchaseRequestId: string): Promise<RequestFileEntity[]> {
    const records = await this.prisma.file.findMany({
      where: { purchase_request_id: purchaseRequestId },
      orderBy: { uploaded_at: 'asc' },
    });

    return records.map(RequestFileMapper.toDomain);
  }

  async delete(id: string, context?: TransactionContext): Promise<void> {
    await prismaClient(this.prisma, context).file.delete({ where: { id } });
  }

  async sumSizeByCompany(companyId: string): Promise<bigint> {
    const result = await this.prisma.file.aggregate({
      where: { company_id: companyId },
      _sum: { size_bytes: true },
    });

    return result._sum.size_bytes ?? 0n;
  }
}
