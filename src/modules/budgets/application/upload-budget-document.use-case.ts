import { createHash, randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuditEventType } from 'generated/prisma/enums';
import { AuditEntity } from 'src/modules/audit/domain/audit-log.entity';
import { IAuditLogRepository } from 'src/modules/audit/domain/audit-logs.repository.interface';
import { EntitlementsService } from 'src/modules/billing/application/entitlements.service';
import { StorageQuotaExceededError } from 'src/modules/billing/domain/billing.errors';
import { EnvSchema } from 'src/shared/config/env.schema';
import { ValidationError } from 'src/shared/domain/errors/domain.error';
import { detectMimeType } from 'src/shared/domain/file-signature';
import { IStorageService } from 'src/shared/domain/storage.service';
import { BudgetDocumentEntity } from '../domain/budget-document.entity';
import { IBudgetDocumentRepository } from '../domain/budget-documents.repository.interface';
import { FindBudgetByIdUseCase } from './find-budget-by-id.use-case';

export interface UploadBudgetDocumentInput {
  fileName: string;
  buffer: Buffer;
  description?: string | null;
}

@Injectable()
export class UploadBudgetDocumentUseCase {
  constructor(
    private readonly budgetDocumentRepository: IBudgetDocumentRepository,
    private readonly findBudgetByIdUseCase: FindBudgetByIdUseCase,
    private readonly storageService: IStorageService,
    private readonly configService: ConfigService<EnvSchema, true>,
    private readonly entitlementsService: EntitlementsService,
    private readonly auditLogRepository: IAuditLogRepository,
  ) {}

  async execute(
    budgetId: string,
    companyId: string,
    userId: string,
    input: UploadBudgetDocumentInput,
  ): Promise<BudgetDocumentEntity> {
    await this.findBudgetByIdUseCase.execute(budgetId, companyId);

    const maxBytes =
      this.configService.get('UPLOAD_MAX_SIZE_BYTES', { infer: true }) ??
      10485760;

    if (input.buffer.byteLength > maxBytes) {
      throw new ValidationError(
        `O arquivo tem ${(input.buffer.byteLength / 1048576).toFixed(1)}MB e o limite é ${(maxBytes / 1048576).toFixed(1)}MB.`,
      );
    }

    const detected = detectMimeType(input.buffer);

    if (!detected) {
      throw new ValidationError(
        'Não foi possível identificar o tipo deste arquivo. Envie um PDF ou uma imagem (JPG, PNG).',
      );
    }

    const { maxStorageBytes } =
      await this.entitlementsService.forCompany(companyId);

    if (maxStorageBytes !== null) {
      const usedBytes =
        await this.budgetDocumentRepository.sumSizeByCompany(companyId);

      if (usedBytes + BigInt(input.buffer.byteLength) > maxStorageBytes) {
        throw new StorageQuotaExceededError(usedBytes, maxStorageBytes);
      }
    }

    const sha256 = createHash('sha256').update(input.buffer).digest('hex');
    const storageKey = `companies/${companyId}/budgets/${budgetId}/${randomUUID()}`;

    await this.storageService.upload({
      storageKey,
      body: input.buffer,
      mimeType: detected,
    });

    const document = await this.budgetDocumentRepository.create({
      companyId,
      budgetId,
      fileName: input.fileName,
      mimeType: detected,
      sizeBytes: BigInt(input.buffer.byteLength),
      storageKey,
      sha256,
      description: input.description ?? null,
      uploadedById: userId,
    });

    await this.auditLogRepository.record({
      companyId,
      actorId: userId,
      eventType: AuditEventType.BUDGET_DOCUMENT_ADDED,
      entityType: AuditEntity.BUDGET,
      entityId: budgetId,
      newData: { fileName: document.fileName, sha256: document.sha256 },
    });

    return document;
  }
}
