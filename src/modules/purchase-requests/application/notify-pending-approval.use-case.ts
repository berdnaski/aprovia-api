import { Injectable, Logger } from '@nestjs/common';
import { NotificationEvent, TokenType } from 'generated/prisma/enums';
import { IssueTokenService } from 'src/modules/auth/application/services/issue-token.service';
import { EntitlementsService } from 'src/modules/billing/application/entitlements.service';
import { PlanFeature } from 'src/modules/billing/domain/entitlements';
import { INotificationRecipientRepository } from 'src/modules/notifications/domain/notification-recipients.repository.interface';
import {
  INotificationDispatcher,
  RecipientKind,
} from 'src/modules/notifications/domain/notification.dispatcher';

export interface PendingApprovalNotice {
  companyId: string;
  stepId: string;
  approverMemberId: string;
  requesterMemberId: string;
  requestId: string;
  number: string;
  title: string;
  totalAmountCents: bigint;
}

@Injectable()
export class NotifyPendingApprovalUseCase {
  private readonly logger = new Logger(NotifyPendingApprovalUseCase.name);

  constructor(
    private readonly issueTokenService: IssueTokenService,
    private readonly entitlementsService: EntitlementsService,
    private readonly notificationDispatcher: INotificationDispatcher,
    private readonly notificationRecipientRepository: INotificationRecipientRepository,
  ) {}

  async execute(notice: PendingApprovalNotice): Promise<void> {
    try {
      const [approver, requester] = await Promise.all([
        this.notificationRecipientRepository.resolve({
          kind: RecipientKind.MEMBER,
          memberId: notice.approverMemberId,
        }),
        this.notificationRecipientRepository.resolve({
          kind: RecipientKind.MEMBER,
          memberId: notice.requesterMemberId,
        }),
      ]);

      const emailApproval =
        approver !== null &&
        (await this.entitlementsService.has(
          notice.companyId,
          PlanFeature.EMAIL_APPROVAL,
        ));

      const approvalToken =
        approver && emailApproval
          ? await this.issueTokenService.execute({
              userId: approver.userId,
              type: TokenType.APPROVAL_ACTION,
              referenceId: notice.stepId,
            })
          : null;

      await this.notificationDispatcher.dispatch({
        companyId: notice.companyId,
        event: NotificationEvent.REQUEST_PENDING,
        recipient: {
          kind: RecipientKind.MEMBER,
          memberId: notice.approverMemberId,
        },
        scope: notice.stepId,
        params: {
          requestId: notice.requestId,
          number: notice.number,
          requestTitle: notice.title,
          amountCents: notice.totalAmountCents.toString(),
          requesterName: requester?.name ?? 'O solicitante',
          approvalToken,
        },
      });
    } catch (error) {
      this.logger.error(
        `Não foi possível avisar o aprovador da etapa ${notice.stepId}: ${(error as Error).message}`,
      );
    }
  }
}
