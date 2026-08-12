import { Injectable } from '@nestjs/common';
import {
  AuditEventType,
  BudgetEntryType,
  CompanyMemberRole,
  RequestStatus,
  TokenType,
} from 'generated/prisma/enums';
import { AuditEntity } from 'src/modules/audit/domain/audit-log.entity';
import { IAuditLogRepository } from 'src/modules/audit/domain/audit-logs.repository.interface';
import { ITokensRepository } from 'src/modules/auth/domain/tokens.repository.interface';
import { IBudgetEntryRepository } from 'src/modules/budgets/domain/budget-entries.repository.interface';
import { IBudgetRepository } from 'src/modules/budgets/domain/budgets.repository.interface';
import {
  ForbiddenError,
  InvalidStateError,
  ValidationError,
} from 'src/shared/domain/errors/domain.error';
import { ITransactionManager } from 'src/shared/domain/transaction.manager';
import { IApprovalStepWriter } from '../domain/approval-steps.writer';
import { PurchaseRequestEntity } from '../domain/purchase-request.entity';
import { IPurchaseRequestRepository } from '../domain/purchase-requests.repository.interface';
import { CancelRequestDto } from '../dto/cancel-request.dto';
import {
  FindRequestByIdUseCase,
  RequestActor,
} from './find-request-by-id.use-case';

const MIN_REASON = 10;

const CANCELABLE_BY_REQUESTER: RequestStatus[] = [
  RequestStatus.DRAFT,
  RequestStatus.PENDING,
  RequestStatus.CHANGES_REQUESTED,
];

@Injectable()
export class CancelRequestUseCase {
  constructor(
    private readonly purchaseRequestRepository: IPurchaseRequestRepository,
    private readonly approvalStepWriter: IApprovalStepWriter,
    private readonly budgetRepository: IBudgetRepository,
    private readonly budgetEntryRepository: IBudgetEntryRepository,
    private readonly findRequestByIdUseCase: FindRequestByIdUseCase,
    private readonly auditLogRepository: IAuditLogRepository,
    private readonly tokensRepository: ITokensRepository,
    private readonly transactionManager: ITransactionManager,
  ) {}

  async execute(
    requestId: string,
    actor: RequestActor,
    data: CancelRequestDto,
  ): Promise<PurchaseRequestEntity> {
    const request = await this.findRequestByIdUseCase.execute(requestId, actor);
    const isAdmin = actor.role === CompanyMemberRole.FINANCE_ADMIN;
    const isApproved = request.status === RequestStatus.APPROVED;

    if (request.status === RequestStatus.CANCELED) {
      throw new InvalidStateError(
        `O pedido ${request.number} já foi cancelado`,
      );
    }

    if (isApproved && !isAdmin) {
      throw new ForbiddenError(
        'Requisições aprovadas não podem ser canceladas pelo Solicitante. A reversão exige um Admin Financeiro (RN41)',
      );
    }

    if (!isApproved) {
      if (!CANCELABLE_BY_REQUESTER.includes(request.status)) {
        throw new InvalidStateError(
          `O pedido ${request.number} não pode mais ser cancelado (status ${request.status})`,
        );
      }

      if (!isAdmin && request.requesterId !== actor.memberId) {
        throw new ForbiddenError('Você só pode cancelar seus próprios pedidos');
      }
    }

    if ((data.reason ?? '').trim().length < MIN_REASON) {
      throw new ValidationError(
        `O motivo do cancelamento é obrigatório e precisa de ao menos ${MIN_REASON} caracteres`,
      );
    }

    const waiting = await this.approvalStepWriter.findWaiting(requestId);

    const canceled = await this.transactionManager.run(async (context) => {
      await this.approvalStepWriter.cancelRemaining(requestId, context);

      if (isApproved) {
        const budget = await this.budgetRepository.findCoveringDate(
          request.costCenterId,
          new Date(),
          context,
        );

        if (budget) {
          await this.budgetEntryRepository.create(
            {
              budgetId: budget.id,
              purchaseRequestId: requestId,
              type: BudgetEntryType.REVERSAL,
              amountCents: -request.totalAmountCents,
              description: `Reversão do pedido ${request.number}: ${data.reason}`,
              recordedById: actor.userId,
            },
            context,
          );
        }
      }

      await this.auditLogRepository.record(
        {
          companyId: actor.companyId,
          actorId: actor.userId,
          eventType: AuditEventType.CANCELED,
          entityType: AuditEntity.PURCHASE_REQUEST,
          entityId: requestId,
          oldData: { status: request.status },
          newData: {
            number: request.number,
            reason: data.reason,
            reverted: isApproved,
            revertedCents: isApproved
              ? request.totalAmountCents.toString()
              : null,
          },
        },
        context,
      );

      return this.purchaseRequestRepository.cancel(
        requestId,
        {
          canceledById: actor.userId,
          cancelReason: data.reason,
        },
        context,
      );
    });

    await this.tokensRepository.consumeByReferences(
      waiting.map((step) => step.id),
      TokenType.APPROVAL_ACTION,
    );

    return canceled;
  }
}
