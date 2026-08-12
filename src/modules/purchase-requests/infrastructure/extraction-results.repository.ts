import { Injectable } from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { PrismaService } from 'src/shared/infrastructure/database/prisma.service';
import {
  CompleteExtractionData,
  ExtractionRecord,
  IExtractionResultRepository,
} from '../domain/extraction-results.repository.interface';
import { ExtractionStatus } from '../domain/extraction.service';
import { ExtractionResultMapper } from './mappers/extraction-result.mapper';

@Injectable()
export class ExtractionResultRepository implements IExtractionResultRepository {
  constructor(private readonly prisma: PrismaService) {}

  async enqueue(
    purchaseRequestId: string,
    requestedById: string,
  ): Promise<ExtractionRecord> {
    const raw = await this.prisma.extractionResult.create({
      data: {
        purchase_request_id: purchaseRequestId,
        requested_by_id: requestedById,
        status: ExtractionStatus.QUEUED,
      },
    });

    return ExtractionResultMapper.toDomain(raw);
  }

  async complete(
    id: string,
    data: CompleteExtractionData,
  ): Promise<ExtractionRecord> {
    const raw = await this.prisma.extractionResult.update({
      where: { id },
      data: {
        status: data.status,
        fields: data.fields ? { ...data.fields } : Prisma.JsonNull,
        failure_reason: data.failureReason,
        completed_at: new Date(),
      },
    });

    return ExtractionResultMapper.toDomain(raw);
  }

  async findLatest(
    purchaseRequestId: string,
  ): Promise<ExtractionRecord | null> {
    const raw = await this.prisma.extractionResult.findFirst({
      where: { purchase_request_id: purchaseRequestId },
      orderBy: { created_at: 'desc' },
    });

    return raw ? ExtractionResultMapper.toDomain(raw) : null;
  }
}
