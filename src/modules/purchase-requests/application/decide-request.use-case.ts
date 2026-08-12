import { Injectable } from '@nestjs/common';
import {
  AuditEventType,
  BudgetEntryType,
  DecisionChannel,
  DecisionType,
  NotificationEvent,
  RequestStatus,
  StepStatus,
} from 'generated/prisma/enums';
import { AuditEntity } from 'src/modules/audit/domain/audit-log.entity';
import { IAuditLogRepository } from 'src/modules/audit/domain/audit-logs.repository.interface';
import { IBudgetEntryRepository } from 'src/modules/budgets/domain/budget-entries.repository.interface';
import { IBudgetRepository } from 'src/modules/budgets/domain/budgets.repository.interface';
import { EntitlementsService } from 'src/modules/billing/application/entitlements.service';
import { BudgetPeriodService } from 'src/modules/budgets/domain/services/budget-period.service';
import { FindCompanyByIdUseCase } from 'src/modules/companies/application/find-company-by-id.use-case';
import { FindCostCenterByIdUseCase } from 'src/modules/cost-centers/application/find-cost-center-by-id.use-case';
import { INotificationRecipientRepository } from 'src/modules/notifications/domain/notification-recipients.repository.interface';
import {
  DispatchNotificationInput,
  INotificationDispatcher,
  RecipientKind,
} from 'src/modules/notifications/domain/notification.dispatcher';
import { AssertSupplierUsableUseCase } from 'src/modules/suppliers/application/assert-supplier-usable.use-case';
import {
  ForbiddenError,
  InvalidStateError,
  ValidationError,
} from 'src/shared/domain/errors/domain.error';
import { addBusinessHours } from 'src/shared/domain/business-calendar';
import { ITransactionManager } from 'src/shared/domain/transaction.manager';
import {
  IApprovalStepWriter,
  StepDeadlines,
} from '../domain/approval-steps.writer';
import { IDecisionRepository } from '../domain/decisions.repository.interface';
import { PurchaseRequestEntity } from '../domain/purchase-request.entity';
import { IPurchaseRequestRepository } from '../domain/purchase-requests.repository.interface';
import { DecideRequestDto } from '../dto/decide-request.dto';
import {
  FindRequestByIdUseCase,
  RequestActor,
} from './find-request-by-id.use-case';
import { NotifyPendingApprovalUseCase } from './notify-pending-approval.use-case';

const MIN_JUSTIFICATION = 10;

const NEEDS_JUSTIFICATION: DecisionType[] = [
  DecisionType.REJECTED,
  DecisionType.CHANGES_REQUESTED,
  DecisionType.APPROVED_WITH_OVERRIDE,
];

const BUDGET_ALERT_THRESHOLDS = [80, 100] as const;

@Injectable()
export class DecideRequestUseCase {
  constructor(
    private readonly purchaseRequestRepository: IPurchaseRequestRepository,
    private readonly approvalStepWriter: IApprovalStepWriter,
    private readonly decisionRepository: IDecisionRepository,
    private readonly budgetRepository: IBudgetRepository,
    private readonly budgetEntryRepository: IBudgetEntryRepository,
    private readonly findRequestByIdUseCase: FindRequestByIdUseCase,
    private readonly assertSupplierUsableUseCase: AssertSupplierUsableUseCase,
    private readonly findCostCenterByIdUseCase: FindCostCenterByIdUseCase,
    private readonly findCompanyByIdUseCase: FindCompanyByIdUseCase,
    private readonly auditLogRepository: IAuditLogRepository,
    private readonly notificationDispatcher: INotificationDispatcher,
    private readonly notificationRecipientRepository: INotificationRecipientRepository,
    private readonly notifyPendingApprovalUseCase: NotifyPendingApprovalUseCase,
    private readonly budgetPeriodService: BudgetPeriodService,
    private readonly entitlementsService: EntitlementsService,
    private readonly transactionManager: ITransactionManager,
  ) {}

  async execute(
    requestId: string,
    actor: RequestActor,
    data: DecideRequestDto,
  ): Promise<PurchaseRequestEntity> {
    await this.entitlementsService.assertOperational(actor.companyId);

    const request = await this.findRequestByIdUseCase.execute(requestId, actor);

    if (request.status !== RequestStatus.PENDING) {
      throw new InvalidStateError(
        `O pedido ${request.number} não está aguardando decisão (status ${request.status})`,
      );
    }

    if (
      NEEDS_JUSTIFICATION.includes(data.type) &&
      (data.justification ?? '').trim().length < MIN_JUSTIFICATION
    ) {
      throw new ValidationError(
        `A justificativa é obrigatória e precisa de ao menos ${MIN_JUSTIFICATION} caracteres (RN44)`,
      );
    }

    const waiting = await this.approvalStepWriter.findWaiting(requestId);
    const step = waiting[0];

    if (!step) {
      throw new InvalidStateError('Não há etapa aguardando decisão');
    }

    if (step.expectedApproverId !== actor.memberId) {
      throw new ForbiddenError(
        'Esta etapa está atribuída a outro aprovador. Se você é substituto, a etapa precisa ter sido roteada a você na submissão',
      );
    }

    if (step.approverIds.includes(actor.memberId)) {
      throw new ValidationError(
        'Você já assinou esta etapa. A dupla aprovação exige dois aprovadores distintos (RN26)',
      );
    }

    const isLastStep = waiting.length === 1;
    const signaturesNeeded = step.requiresDualApproval ? 2 : 1;
    const stepCloses = step.approvalCount + 1 >= signaturesNeeded;
    const approves =
      data.type === DecisionType.APPROVED ||
      data.type === DecisionType.APPROVED_WITH_OVERRIDE;

    if (approves && isLastStep && stepCloses && request.supplierId) {
      await this.assertSupplierUsableUseCase.forApproval(
        request.supplierId,
        actor.companyId,
      );
    }

    const budget = await this.budgetRepository.findCoveringDate(
      request.costCenterId,
      new Date(),
    );
    const committed = budget
      ? await this.budgetEntryRepository.sumByBudget(budget.id)
      : 0n;

    const total = budget?.totalAmountCents ?? 0n;

    const startedAt = new Date();
    const company = await this.findCompanyByIdUseCase.execute(actor.companyId);

    const deadlines: StepDeadlines = {
      reminderDueAt: addBusinessHours(startedAt, company.reminderHours),
      escalationDueAt: addBusinessHours(startedAt, company.escalationHours),
    };

    const AUDIT_BY_DECISION: Record<DecisionType, AuditEventType> = {
      APPROVED: AuditEventType.APPROVED,
      APPROVED_WITH_OVERRIDE: AuditEventType.APPROVED,
      REJECTED: AuditEventType.REJECTED,
      CHANGES_REQUESTED: AuditEventType.CHANGES_REQUESTED,
    };

    const decided = await this.transactionManager.run(async (context) => {
      await this.auditLogRepository.record(
        {
          companyId: actor.companyId,
          actorId: actor.userId,
          eventType: AUDIT_BY_DECISION[data.type],
          entityType: AuditEntity.PURCHASE_REQUEST,
          entityId: requestId,
          newData: {
            number: request.number,
            decision: data.type,
            stepOrder: step.stepOrder,
            justification: data.justification ?? null,
            onBehalfOfId: data.onBehalfOfId ?? null,
            availableAtTimeCents: (total - committed).toString(),
          },
        },
        context,
      );

      await this.decisionRepository.create(
        {
          approvalStepId: step.id,
          deciderId: actor.memberId,
          onBehalfOfId: data.onBehalfOfId ?? null,
          type: data.type,
          justification: data.justification ?? null,
          budgetAtTimeCents: total,
          committedAtTimeCents: committed,
          availableAtTimeCents: total - committed,
          channel: data.channel ?? DecisionChannel.PLATFORM,
        },
        context,
      );

      if (data.type === DecisionType.REJECTED) {
        await this.approvalStepWriter.closeStep(
          step.id,
          StepStatus.REJECTED,
          context,
        );
        await this.approvalStepWriter.cancelRemaining(requestId, context);

        return this.purchaseRequestRepository.finalize(
          requestId,
          { status: RequestStatus.REJECTED, finalizedAt: new Date() },
          context,
        );
      }

      if (data.type === DecisionType.CHANGES_REQUESTED) {
        await this.approvalStepWriter.cancelRemaining(requestId, context);

        return this.purchaseRequestRepository.finalize(
          requestId,
          { status: RequestStatus.CHANGES_REQUESTED, finalizedAt: null },
          context,
        );
      }

      if (!stepCloses) {
        return request;
      }

      await this.approvalStepWriter.closeStep(
        step.id,
        StepStatus.APPROVED,
        context,
      );

      if (!isLastStep) {
        await this.approvalStepWriter.startStep(
          requestId,
          step.stepOrder + 1,
          deadlines,
          context,
        );

        return request;
      }

      if (budget) {
        await this.budgetEntryRepository.create(
          {
            budgetId: budget.id,
            purchaseRequestId: request.id,
            type: BudgetEntryType.CONSUMPTION,
            amountCents: request.totalAmountCents,
            description: `Aprovação do pedido ${request.number}`,
            recordedById: actor.userId,
          },
          context,
        );
      }

      return this.purchaseRequestRepository.finalize(
        requestId,
        { status: RequestStatus.APPROVED, finalizedAt: new Date() },
        context,
      );
    });

    const closedRequest =
      data.type === DecisionType.REJECTED ||
      (approves && isLastStep && stepCloses);
    const returned = data.type === DecisionType.CHANGES_REQUESTED;
    const nextStep =
      approves && stepCloses && !isLastStep ? waiting[1] : undefined;
    const consumed = approves && isLastStep && stepCloses;

    const decider = await this.notificationRecipientRepository.resolve({
      kind: RecipientKind.MEMBER,
      memberId: actor.memberId,
    });
    const deciderName = decider?.name ?? 'O aprovador';

    const notifications: DispatchNotificationInput[] = [];

    if (returned) {
      notifications.push({
        companyId: actor.companyId,
        event: NotificationEvent.REQUEST_RETURNED,
        recipient: {
          kind: RecipientKind.MEMBER,
          memberId: request.requesterId,
        },
        scope: step.id,
        params: {
          requestId,
          number: request.number,
          requestTitle: request.title,
          deciderName,
          justification: data.justification ?? null,
        },
      });
    }

    if (closedRequest) {
      notifications.push({
        companyId: actor.companyId,
        event: NotificationEvent.DECISION_MADE,
        recipient: {
          kind: RecipientKind.MEMBER,
          memberId: request.requesterId,
        },
        scope: step.id,
        params: {
          requestId,
          number: request.number,
          requestTitle: request.title,
          decision: data.type,
          deciderName,
          justification: data.justification ?? null,
        },
      });
    }

    if (nextStep) {
      await this.notifyPendingApprovalUseCase.execute({
        companyId: actor.companyId,
        stepId: nextStep.id,
        approverMemberId: nextStep.expectedApproverId,
        requesterMemberId: request.requesterId,
        requestId,
        number: request.number,
        title: request.title,
        totalAmountCents: request.totalAmountCents,
      });
    }

    if (consumed && budget) {
      const consumedAfter = committed + request.totalAmountCents;
      const crossed = BUDGET_ALERT_THRESHOLDS.filter(
        (threshold) =>
          committed * 100n < BigInt(threshold) * total &&
          consumedAfter * 100n >= BigInt(threshold) * total,
      );

      if (crossed.length > 0) {
        const costCenter = await this.findCostCenterByIdUseCase.execute(
          request.costCenterId,
          actor.companyId,
        );
        const admins =
          await this.notificationRecipientRepository.listFinanceAdmins(
            actor.companyId,
          );
        const audience = new Set([
          costCenter.managerId,
          ...admins.map((admin) => admin.memberId),
        ]);

        for (const threshold of crossed) {
          for (const memberId of audience) {
            notifications.push({
              companyId: actor.companyId,
              event: NotificationEvent.BUDGET_ALERT,
              recipient: { kind: RecipientKind.MEMBER, memberId },
              scope: `${budget.id}:${threshold}`,
              params: {
                costCenterId: costCenter.id,
                costCenterName: costCenter.name,
                thresholdPercent: threshold,
                period: this.budgetPeriodService.currentMonthKey(
                  budget.periodStart,
                ),
                totalCents: total.toString(),
                committedCents: consumedAfter.toString(),
              },
            });
          }
        }
      }
    }

    await this.notificationDispatcher.dispatchAll(notifications);

    return decided;
  }
}
