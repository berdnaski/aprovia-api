import { Injectable } from '@nestjs/common';
import { EntitlementsService } from 'src/modules/billing/application/entitlements.service';
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
import { FindCompanyByIdUseCase } from 'src/modules/companies/application/find-company-by-id.use-case';
import { AssertSupplierUsableUseCase } from 'src/modules/suppliers/application/assert-supplier-usable.use-case';
import { ValidationError } from 'src/shared/domain/errors/domain.error';
import { ITransactionManager } from 'src/shared/domain/transaction.manager';
import { PurchaseRequestEntity } from '../domain/purchase-request.entity';
import {
  CostCenterWithoutBudgetError,
  EmptyRequestError,
} from '../domain/purchase-requests.errors';
import { IPurchaseRequestRepository } from '../domain/purchase-requests.repository.interface';
import { IRequestItemRepository } from '../domain/request-items.repository.interface';
import { IApprovalStepWriter } from '../domain/approval-steps.writer';
import { SubmitRequestDto } from '../dto/submit-request.dto';
import {
  FindRequestByIdUseCase,
  RequestActor,
} from './find-request-by-id.use-case';
import {
  GetRequestBudgetUseCase,
  RequestBudgetVerdict,
} from './get-request-budget.use-case';

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
    private readonly getRequestBudgetUseCase: GetRequestBudgetUseCase,
    private readonly auditLogRepository: IAuditLogRepository,
    private readonly notifyPendingApprovalUseCase: NotifyPendingApprovalUseCase,
    private readonly transactionManager: ITransactionManager,
    private readonly entitlementsService: EntitlementsService,
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

    await this.entitlementsService.assertRequestQuota(actor.companyId);

    const items = await this.requestItemRepository.listByRequest(requestId);

    if (items.length === 0) {
      throw new EmptyRequestError();
    }

    if (request.supplierId) {
      await this.assertSupplierUsableUseCase.forSubmission(
        request.supplierId,
        actor.companyId,
      );
    }

    const total = await this.requestItemRepository.sumTotal(requestId);

    if (!data.confirmDuplicate && request.supplierId) {
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
          `Você criou ${duplicates.length} pedido(s) parecido(s) nos últimos ${DUPLICATE_WINDOW_DAYS} dias para o mesmo fornecedor. Confirme que não é duplicata para prosseguir.`,
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

    if (!request.costCenterId) {
      throw new ValidationError(
        'Escolha o Centro de Custo antes de enviar: é ele que define o orçamento e quem aprova.',
      );
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

    const budget = await this.getRequestBudgetUseCase.forRequest(
      request,
      actor.companyId,
      submittedAt,
    );

    const unbudgeted = budget.lines.find(
      (line) => line.verdict === RequestBudgetVerdict.NO_BUDGET,
    );

    if (unbudgeted) {
      throw new CostCenterWithoutBudgetError(unbudgeted.costCenterName);
    }

    const requiresOverride =
      budget.verdict === RequestBudgetVerdict.REQUIRES_OVERRIDE;

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
