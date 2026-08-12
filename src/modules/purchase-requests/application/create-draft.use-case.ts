import { Injectable } from '@nestjs/common';
import {
  AuditEventType,
  OnboardingStep,
  Urgency,
} from 'generated/prisma/enums';
import { AuditEntity } from 'src/modules/audit/domain/audit-log.entity';
import { IAuditLogRepository } from 'src/modules/audit/domain/audit-logs.repository.interface';
import { EntitlementsService } from 'src/modules/billing/application/entitlements.service';
import { FindCategoryByIdUseCase } from 'src/modules/categories/application/find-category-by-id.use-case';
import { FindCompanyByIdUseCase } from 'src/modules/companies/application/find-company-by-id.use-case';
import { OnboardingIncompleteError } from 'src/modules/companies/domain/companies.errors';
import { FindCostCenterByIdUseCase } from 'src/modules/cost-centers/application/find-cost-center-by-id.use-case';
import { FindSupplierByIdUseCase } from 'src/modules/suppliers/application/find-supplier-by-id.use-case';
import { ValidationError } from 'src/shared/domain/errors/domain.error';
import { isUniqueViolation } from 'src/shared/domain/prisma-error';
import { ITransactionManager } from 'src/shared/domain/transaction.manager';
import { InactiveCategoryError } from 'src/modules/categories/domain/categories.errors';
import { PurchaseRequestEntity } from '../domain/purchase-request.entity';
import { RequestNumberExhaustedError } from '../domain/purchase-requests.errors';
import { IPurchaseRequestRepository } from '../domain/purchase-requests.repository.interface';
import {
  nextRequestNumber,
  requestNumberPrefix,
} from '../domain/services/request-number.service';
import { CreateDraftDto } from '../dto/create-draft.dto';

const MAX_NUMBER_ATTEMPTS = 5;

@Injectable()
export class CreateDraftUseCase {
  constructor(
    private readonly purchaseRequestRepository: IPurchaseRequestRepository,
    private readonly findCostCenterByIdUseCase: FindCostCenterByIdUseCase,
    private readonly findCategoryByIdUseCase: FindCategoryByIdUseCase,
    private readonly findSupplierByIdUseCase: FindSupplierByIdUseCase,
    private readonly findCompanyByIdUseCase: FindCompanyByIdUseCase,
    private readonly entitlementsService: EntitlementsService,
    private readonly auditLogRepository: IAuditLogRepository,
    private readonly transactionManager: ITransactionManager,
  ) {}

  async execute(
    companyId: string,
    requesterId: string,
    data: CreateDraftDto,
    actorUserId: string | null = null,
  ): Promise<PurchaseRequestEntity> {
    const company = await this.findCompanyByIdUseCase.execute(companyId);

    if (company.onboardingStep !== OnboardingStep.DONE) {
      throw new OnboardingIncompleteError(['onboarding']);
    }

    await this.entitlementsService.assertOperational(companyId);

    const costCenter = await this.findCostCenterByIdUseCase.execute(
      data.costCenterId,
      companyId,
    );

    if (costCenter.disabledAt) {
      throw new ValidationError(
        'Não é possível criar pedidos para um Centro de Custo inativo (RN13)',
      );
    }

    if (data.categoryId) {
      const category = await this.findCategoryByIdUseCase.execute(
        data.categoryId,
        companyId,
      );

      if (!category.active) {
        throw new InactiveCategoryError();
      }
    }

    if (data.supplierId) {
      await this.findSupplierByIdUseCase.execute(data.supplierId, companyId);
    }

    return this.allocateNumberAndCreate(
      companyId,
      requesterId,
      data,
      actorUserId,
    );
  }

  private async allocateNumberAndCreate(
    companyId: string,
    requesterId: string,
    data: CreateDraftDto,
    actorUserId: string | null,
  ): Promise<PurchaseRequestEntity> {
    const year = new Date().getUTCFullYear();
    const prefix = requestNumberPrefix(year);

    for (let attempt = 0; attempt < MAX_NUMBER_ATTEMPTS; attempt += 1) {
      try {
        return await this.transactionManager.run(async (context) => {
          const lastNumber =
            await this.purchaseRequestRepository.findLastNumber(
              companyId,
              prefix,
              context,
            );

          const created = await this.purchaseRequestRepository.create(
            {
              companyId,
              number: nextRequestNumber(year, lastNumber),
              requesterId,
              costCenterId: data.costCenterId,
              categoryId: data.categoryId ?? null,
              supplierId: data.supplierId ?? null,
              title: data.title,
              description: data.description ?? null,
              urgency: data.urgency ?? Urgency.MEDIUM,
              paymentTerms: data.paymentTerms ?? null,
            },
            context,
          );

          await this.auditLogRepository.record(
            {
              companyId,
              actorId: actorUserId,
              eventType: AuditEventType.CREATED,
              entityType: AuditEntity.PURCHASE_REQUEST,
              entityId: created.id,
              newData: { number: created.number, title: created.title },
            },
            context,
          );

          return created;
        });
      } catch (error) {
        if (!isUniqueViolation(error)) {
          throw error;
        }
      }
    }

    throw new RequestNumberExhaustedError();
  }
}
