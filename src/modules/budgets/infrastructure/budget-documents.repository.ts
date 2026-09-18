import { Injectable } from '@nestjs/common';
import { FileType } from 'generated/prisma/enums';
import { PrismaService } from 'src/shared/infrastructure/database/prisma.service';
import { BudgetDocumentEntity } from '../domain/budget-document.entity';
import {
  CreateBudgetDocumentData,
  IBudgetDocumentRepository,
} from '../domain/budget-documents.repository.interface';
import { BudgetDocumentMapper } from './mappers/budget-document.mapper';

@Injectable()
export class BudgetDocumentRepository implements IBudgetDocumentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateBudgetDocumentData): Promise<BudgetDocumentEntity> {
    const raw = await this.prisma.file.create({
      data: {
        company_id: data.companyId,
        type: FileType.BUDGET_DOCUMENT,
        budget_id: data.budgetId,
        file_name: data.fileName,
        mime_type: data.mimeType,
        size_bytes: data.sizeBytes,
        storage_key: data.storageKey,
        sha256: data.sha256,
        description: data.description,
        uploaded_by_id: data.uploadedById,
      },
    });

    return BudgetDocumentMapper.toDomain(raw);
  }

  async findById(id: string): Promise<BudgetDocumentEntity | null> {
    const raw = await this.prisma.file.findFirst({
      where: { id, type: FileType.BUDGET_DOCUMENT },
    });

    return raw ? BudgetDocumentMapper.toDomain(raw) : null;
  }

  async listByBudget(budgetId: string): Promise<BudgetDocumentEntity[]> {
    const records = await this.prisma.file.findMany({
      where: { budget_id: budgetId, type: FileType.BUDGET_DOCUMENT },
      orderBy: { uploaded_at: 'desc' },
    });

    return records.map(BudgetDocumentMapper.toDomain);
  }

  async sumSizeByCompany(companyId: string): Promise<bigint> {
    const result = await this.prisma.file.aggregate({
      where: { company_id: companyId },
      _sum: { size_bytes: true },
    });

    return result._sum.size_bytes ?? 0n;
  }
}
