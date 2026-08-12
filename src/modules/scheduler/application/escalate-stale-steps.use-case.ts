import { Injectable, Logger } from '@nestjs/common';
import {
  AuditEventType,
  NotificationEvent,
  TokenType,
} from 'generated/prisma/enums';
import { AuditEntity } from 'src/modules/audit/domain/audit-log.entity';
import { IAuditLogRepository } from 'src/modules/audit/domain/audit-logs.repository.interface';
import { ITokensRepository } from 'src/modules/auth/domain/tokens.repository.interface';
import { FindCompanyByIdUseCase } from 'src/modules/companies/application/find-company-by-id.use-case';
import { ICompanyMemberRepository } from 'src/modules/companies/domain/company-members.repository.interface';
import { INotificationRecipientRepository } from 'src/modules/notifications/domain/notification-recipients.repository.interface';
import {
  DispatchNotificationInput,
  INotificationDispatcher,
  RecipientKind,
} from 'src/modules/notifications/domain/notification.dispatcher';
import { NotifyPendingApprovalUseCase } from 'src/modules/purchase-requests/application/notify-pending-approval.use-case';
import {
  ISlaStepRepository,
  SlaStepRecord,
} from 'src/modules/purchase-requests/domain/sla-steps.repository.interface';
import { addBusinessHours } from 'src/shared/domain/business-calendar';

const BATCH_SIZE = 200;

@Injectable()
export class EscalateStaleStepsUseCase {
  private readonly logger = new Logger(EscalateStaleStepsUseCase.name);

  constructor(
    private readonly slaStepRepository: ISlaStepRepository,
    private readonly companyMemberRepository: ICompanyMemberRepository,
    private readonly findCompanyByIdUseCase: FindCompanyByIdUseCase,
    private readonly notificationRecipientRepository: INotificationRecipientRepository,
    private readonly notificationDispatcher: INotificationDispatcher,
    private readonly notifyPendingApprovalUseCase: NotifyPendingApprovalUseCase,
    private readonly auditLogRepository: IAuditLogRepository,
    private readonly tokensRepository: ITokensRepository,
  ) {}

  async execute(now: Date = new Date()): Promise<number> {
    const due = await this.slaStepRepository.listDueForEscalation(
      now,
      BATCH_SIZE,
    );

    let escalated = 0;

    for (const step of due) {
      const target = await this.resolveTarget(step);

      if (!target) {
        await this.slaStepRepository.clearEscalation(step.stepId, step.dueAt);
        this.logger.error(
          `Pedido ${step.number} passou do prazo e não há para quem escalonar: nenhum superior nem Admin Financeiro elegível`,
        );
        continue;
      }

      const company = await this.findCompanyByIdUseCase.execute(step.companyId);

      const claimed = await this.slaStepRepository.escalate(step.stepId, {
        toMemberId: target,
        fromMemberId: step.expectedApproverId,
        expectedDueAt: step.dueAt,
        reminderDueAt: addBusinessHours(now, company.reminderHours),
        escalationDueAt: addBusinessHours(now, company.escalationHours),
      });

      if (!claimed) {
        continue;
      }

      escalated += 1;

      await this.tokensRepository.consumeByReferences(
        [step.stepId],
        TokenType.APPROVAL_ACTION,
      );

      await this.auditLogRepository.record({
        companyId: step.companyId,
        actorId: null,
        eventType: AuditEventType.ESCALATED,
        entityType: AuditEntity.PURCHASE_REQUEST,
        entityId: step.requestId,
        oldData: { expectedApproverId: step.expectedApproverId },
        newData: {
          number: step.number,
          expectedApproverId: target,
          stepOrder: step.stepOrder,
          dueAt: step.dueAt.toISOString(),
        },
      });

      await this.announce(step, target);
    }

    if (escalated > 0) {
      this.logger.log(`Etapas escalonadas por SLA: ${escalated}`);
    }

    return escalated;
  }

  private async resolveTarget(step: SlaStepRecord): Promise<string | null> {
    const approver = await this.companyMemberRepository.findById(
      step.expectedApproverId,
    );

    const excluded = new Set([step.expectedApproverId, step.requesterId]);

    if (approver?.managerId && !excluded.has(approver.managerId)) {
      const manager = await this.companyMemberRepository.findById(
        approver.managerId,
      );

      if (manager && !manager.disabledAt) {
        return manager.id;
      }
    }

    const admins = await this.notificationRecipientRepository.listFinanceAdmins(
      step.companyId,
    );

    return (
      admins.find((admin) => !excluded.has(admin.memberId))?.memberId ?? null
    );
  }

  private async announce(step: SlaStepRecord, target: string): Promise<void> {
    const [original, escalatedTo] = await Promise.all([
      this.notificationRecipientRepository.resolve({
        kind: RecipientKind.MEMBER,
        memberId: step.expectedApproverId,
      }),
      this.notificationRecipientRepository.resolve({
        kind: RecipientKind.MEMBER,
        memberId: target,
      }),
    ]);

    const admins = await this.notificationRecipientRepository.listFinanceAdmins(
      step.companyId,
    );

    const audience = new Set([
      step.expectedApproverId,
      ...admins.map((admin) => admin.memberId),
    ]);

    const notifications: DispatchNotificationInput[] = [...audience].map(
      (memberId) => ({
        companyId: step.companyId,
        event: NotificationEvent.ESCALATED,
        recipient: { kind: RecipientKind.MEMBER, memberId },
        scope: step.stepId,
        params: {
          requestId: step.requestId,
          number: step.number,
          requestTitle: step.title,
          originalApproverName: original?.name ?? 'o aprovador anterior',
          escalatedToName: escalatedTo?.name ?? 'o superior hierárquico',
        },
      }),
    );

    await this.notificationDispatcher.dispatchAll(notifications);

    await this.notifyPendingApprovalUseCase.execute({
      companyId: step.companyId,
      stepId: step.stepId,
      approverMemberId: target,
      requesterMemberId: step.requesterId,
      requestId: step.requestId,
      number: step.number,
      title: step.title,
      totalAmountCents: step.totalAmountCents,
    });
  }
}
