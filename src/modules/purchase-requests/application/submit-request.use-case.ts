import { Injectable } from '@nestjs/common';
import {
  AuditEventType,
  RequestStatus,
  StepStatus,
} from 'generated/prisma/enums';
import { AuditEntity } from 'src/modules/audit/domain/audit-log.entity';
import { IAuditLogRepository } from 'src/modules/audit/domain/audit-logs.repository.interface';
import { addBusinessHours } from 'src/shared/domain/business-calendar';
import { NotifyPendingApprovalUseCase } from './notify-pending-approval.use-case';
import { SimulateRouteUseCase } from 'src/modules/approval-rules/application/simulate-route.use-case';
import { AssessBudgetAvailabilityUseCase } from 'src/modules/budgets/application/assess-budget-availability.use-case';
import { BudgetVerdict } from 'src/modules/budgets/domain/services/budget-balance.service';
import { FindCompanyByIdUseCase } from 'src/modules/companies/application/find-company-by-id.use-case';
import { AssertSupplierUsableUseCase } from 'src/modules/suppliers/application/assert-supplier-usable.use-case';
import { ValidationError } from 'src/shared/domain/errors/domain.error';
import { ITransactionManager } from 'src/shared/domain/transaction.manager';
import { PurchaseRequestEntity } from '../domain/purchase-request.entity';
import { EmptyRequestError } from '../domain/purchase-requests.errors';
import { IPurchaseRequestRepository } from '../domain/purchase-requests.repository.interface';
import { IRequestItemRepository } from '../domain/request-items.repository.interface';
import { IApprovalStepWriter } from '../domain/approval-steps.writer';
import { SubmitRequestDto } from '../dto/submit-request.dto';
import {
  FindRequestByIdUseCase,
  RequestActor,
} from './find-request-by-id.use-case';

const DUPLICATE_WINDOW_DAYS = 30;
const DUPLICATE_TOLERANCE_PERCENT = 5n;

@Injectable()
export class SubmitRequestUseCase {
  constructor(
    private readonly purchaseRequestRepository: IPurchaseRequestRepository,
    private readonly requestItemRepository: IRequestItemRepository,
    private readonly approvalStepWriter: IApprovalStepWriter,
    private readonly findRequestByIdUseCase: FindRequestByIdUseCase,
    private readonly assertSupplierUsableUseCase: AssertSupplierUsableUseCase,
    private readonly simulateRouteUseCase: SimulateRouteUseCase,
    private readonly findCompanyByIdUseCase: FindCompanyByIdUseCase,
    private readonly assessBudgetAvailabilityUseCase: AssessBudgetAvailabilityUseCase,
    private readonly auditLogRepository: IAuditLogRepository,
    private readonly notifyPendingApprovalUseCase: NotifyPendingApprovalUseCase,
    private readonly transactionManager: ITransactionManager,
  ) {}

  async execute(
    requestId: string,
    actor: RequestActor,
    data: SubmitRequestDto,
  ): Promise<PurchaseRequestEntity> {
    const request = await this.findRequestByIdUseCase.executeAsOwnerDraft(
      requestId,
      actor,
    );

    const items = await this.requestItemRepository.listByRequest(requestId);

    if (items.length === 0) {
      throw new EmptyRequestError();
    }

    if (!request.supplierId) {
      throw new ValidationError(
        'Informe o fornecedor antes de submeter: a validação do CNPJ depende dele (RN34)',
      );
    }

    await this.assertSupplierUsableUseCase.forSubmission(
      request.supplierId,
      actor.companyId,
    );

    const total = await this.requestItemRepository.sumTotal(requestId);

    if (!data.confirmDuplicate) {
      const duplicates = await this.purchaseRequestRepository.findRecentSimilar(
        {
          companyId: actor.companyId,
          requesterId: actor.memberId,
          supplierId: request.supplierId,
          amountCents: total,
          tolerancePercent: DUPLICATE_TOLERANCE_PERCENT,
          since: new Date(
            Date.now() - DUPLICATE_WINDOW_DAYS * 24 * 60 * 60 * 1000,
          ),
          excludeRequestId: requestId,
        },
      );

      if (duplicates.length > 0) {
        throw new ValidationError(
          `Você criou ${duplicates.length} pedido(s) parecido(s) nos últimos ${DUPLICATE_WINDOW_DAYS} dias para o mesmo fornecedor. Confirme que não é duplicata para prosseguir (RN36)`,
          {
            duplicates: duplicates.map((item) => ({
              number: item.number,
              amountCents: item.totalAmountCents.toString(),
              createdAt: item.createdAt.toISOString(),
            })),
          },
        );
      }
    }

    const company = await this.findCompanyByIdUseCase.execute(actor.companyId);
    const submittedAt = new Date();

    const route = await this.simulateRouteUseCase.execute(actor.companyId, {
      amountCents: total,
      costCenterId: request.costCenterId,
      requesterId: actor.memberId,
      categoryId: request.categoryId ?? undefined,
      at: submittedAt,
    });

    const assessment = await this.assessBudgetAvailabilityUseCase.execute(
      request.costCenterId,
      actor.companyId,
      total,
      submittedAt,
    );

    const requiresOverride =
      assessment.verdict === BudgetVerdict.REQUIRES_OVERRIDE;

    const reminderDueAt = addBusinessHours(submittedAt, company.reminderHours);
    const escalationDueAt = addBusinessHours(
      submittedAt,
      company.escalationHours,
    );

    const submitted = await this.transactionManager.run(async (context) => {
      await this.approvalStepWriter.createMany(
        route.steps.map((step) => ({
          purchaseRequestId: requestId,
          expectedApproverId: step.expectedApproverId,
          stepOrder: step.stepOrder,
          requiresDualApproval: step.requiresDualApproval,
          status: StepStatus.WAITING,
          startedAt: step.stepOrder === 1 ? submittedAt : null,
          reminderDueAt: step.stepOrder === 1 ? reminderDueAt : null,
          escalationDueAt: step.stepOrder === 1 ? escalationDueAt : null,
        })),
        context,
      );

      await this.auditLogRepository.record(
        {
          companyId: actor.companyId,
          actorId: actor.userId,
          eventType: AuditEventType.SUBMITTED,
          entityType: AuditEntity.PURCHASE_REQUEST,
          entityId: requestId,
          newData: {
            number: request.number,
            totalAmountCents: total.toString(),
            steps: route.steps.length,
            requiresOverride,
          },
        },
        context,
      );

      return this.purchaseRequestRepository.markSubmitted(
        requestId,
        {
          totalAmountCents: total,
          submittedAt,
          requiresOverride,
          status: RequestStatus.PENDING,
        },
        context,
      );
    });

    const [firstStep] = await this.approvalStepWriter.findWaiting(requestId);

    if (firstStep) {
      await this.notifyPendingApprovalUseCase.execute({
        companyId: actor.companyId,
        stepId: firstStep.id,
        approverMemberId: firstStep.expectedApproverId,
        requesterMemberId: actor.memberId,
        requestId,
        number: submitted.number,
        title: submitted.title,
        totalAmountCents: total,
      });
    }

    return submitted;
  }
}
