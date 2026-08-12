import { Injectable } from '@nestjs/common';
import { RequestStatus, StepStatus, TokenType } from 'generated/prisma/enums';
import { JwtTokenService } from 'src/modules/auth/application/services/jwt-token.service';
import { ITokensRepository } from 'src/modules/auth/domain/tokens.repository.interface';
import { ICompanyMemberRepository } from 'src/modules/companies/domain/company-members.repository.interface';
import { INotificationRecipientRepository } from 'src/modules/notifications/domain/notification-recipients.repository.interface';
import { RecipientKind } from 'src/modules/notifications/domain/notification.dispatcher';
import { NotFoundError } from 'src/shared/domain/errors/domain.error';
import { IApprovalStepWriter } from '../domain/approval-steps.writer';
import { IPurchaseRequestRepository } from '../domain/purchase-requests.repository.interface';
import { RequestActor } from './find-request-by-id.use-case';

const STATUS_LABEL: Record<RequestStatus, string> = {
  DRAFT: 'voltou para rascunho',
  PENDING: 'está em análise',
  APPROVED: 'já foi aprovado',
  COMPLETED: 'já foi concluído',
  REJECTED: 'já foi rejeitado',
  CHANGES_REQUESTED: 'foi devolvido para ajuste',
  CANCELED: 'foi cancelado',
};

export interface EmailApprovalView {
  number: string;
  title: string;
  totalAmountCents: bigint;
  status: RequestStatus;
  requesterName: string;
  approverName: string;
  actionable: boolean;
  reason: string | null;
}

export interface EmailApprovalGrant {
  tokenId: string;
  requestId: string;
  actor: RequestActor;
}

export type EmailApprovalResolution = {
  view: EmailApprovalView;
  grant: EmailApprovalGrant | null;
};

@Injectable()
export class GetEmailApprovalUseCase {
  constructor(
    private readonly tokensRepository: ITokensRepository,
    private readonly jwtTokenService: JwtTokenService,
    private readonly approvalStepWriter: IApprovalStepWriter,
    private readonly purchaseRequestRepository: IPurchaseRequestRepository,
    private readonly companyMemberRepository: ICompanyMemberRepository,
    private readonly notificationRecipientRepository: INotificationRecipientRepository,
  ) {}

  async execute(
    token: string,
    now: Date = new Date(),
  ): Promise<EmailApprovalResolution> {
    const record = await this.tokensRepository.findByValue(
      this.jwtTokenService.hashToken(token),
      TokenType.APPROVAL_ACTION,
    );

    if (!record?.referenceId || !record.userId) {
      throw new NotFoundError('Link de aprovação');
    }

    const step = await this.approvalStepWriter.findById(record.referenceId);

    if (!step) {
      throw new NotFoundError('Etapa de aprovação', record.referenceId);
    }

    const request = await this.purchaseRequestRepository.findById(
      step.purchaseRequestId,
    );

    if (!request) {
      throw new NotFoundError('Pedido', step.purchaseRequestId);
    }

    const approver = await this.companyMemberRepository.findById(
      step.expectedApproverId,
    );

    const [requesterPerson, approverPerson] = await Promise.all([
      this.notificationRecipientRepository.resolve({
        kind: RecipientKind.MEMBER,
        memberId: request.requesterId,
      }),
      this.notificationRecipientRepository.resolve({
        kind: RecipientKind.MEMBER,
        memberId: step.expectedApproverId,
      }),
    ]);

    const reason =
      request.status !== RequestStatus.PENDING
        ? `O pedido ${request.number} ${STATUS_LABEL[request.status]}.`
        : record.consumedAt !== null
          ? 'Este link já foi usado. Cada e-mail de aprovação vale uma única decisão.'
          : record.expiresAt <= now
            ? 'Este link expirou. Decida pela plataforma.'
            : step.status !== StepStatus.WAITING
              ? 'Esta etapa de aprovação já foi encerrada.'
              : approver?.userId !== record.userId
                ? 'Esta etapa foi reatribuída a outro aprovador.'
                : null;

    const view: EmailApprovalView = {
      number: request.number,
      title: request.title,
      totalAmountCents: request.totalAmountCents,
      status: request.status,
      requesterName: requesterPerson?.name ?? 'Solicitante',
      approverName: approverPerson?.name ?? 'Aprovador',
      actionable: reason === null,
      reason,
    };

    if (reason !== null || !approver) {
      return { view, grant: null };
    }

    return {
      view,
      grant: {
        tokenId: record.id,
        requestId: request.id,
        actor: {
          memberId: approver.id,
          userId: approver.userId,
          companyId: approver.companyId,
          role: approver.role,
        },
      },
    };
  }
}
