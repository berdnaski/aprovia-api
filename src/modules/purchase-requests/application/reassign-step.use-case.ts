import { Injectable } from '@nestjs/common';
import {
  AuditEventType,
  CompanyMemberRole,
  RequestStatus,
  TokenType,
} from 'generated/prisma/enums';
import { AuditEntity } from 'src/modules/audit/domain/audit-log.entity';
import { IAuditLogRepository } from 'src/modules/audit/domain/audit-logs.repository.interface';
import { ITokensRepository } from 'src/modules/auth/domain/tokens.repository.interface';

import { FindMemberByIdUseCase } from 'src/modules/companies/application/find-member-by-id.use-case';
import { NotifyPendingApprovalUseCase } from './notify-pending-approval.use-case';
import {
  InvalidStateError,
  ValidationError,
} from 'src/shared/domain/errors/domain.error';
import { IApprovalStepWriter } from '../domain/approval-steps.writer';
import {
  FindRequestByIdUseCase,
  RequestActor,
} from './find-request-by-id.use-case';

@Injectable()
export class ReassignStepUseCase {
  constructor(
    private readonly approvalStepWriter: IApprovalStepWriter,
    private readonly findRequestByIdUseCase: FindRequestByIdUseCase,
    private readonly findMemberByIdUseCase: FindMemberByIdUseCase,
    private readonly auditLogRepository: IAuditLogRepository,
    private readonly tokensRepository: ITokensRepository,
    private readonly notifyPendingApprovalUseCase: NotifyPendingApprovalUseCase,
  ) {}

  async execute(
    requestId: string,
    actor: RequestActor,
    toMemberId: string,
  ): Promise<void> {
    const request = await this.findRequestByIdUseCase.execute(requestId, actor);

    if (request.status !== RequestStatus.PENDING) {
      throw new InvalidStateError(
        `Só é possível reatribuir um pedido aguardando decisão (status atual ${request.status})`,
      );
    }

    const waiting = await this.approvalStepWriter.findWaiting(requestId);
    const step = waiting[0];

    if (!step) {
      throw new InvalidStateError('Não há etapa aguardando decisão');
    }

    if (step.expectedApproverId === toMemberId) {
      throw new ValidationError('O destino já é o aprovador desta etapa');
    }

    const original = await this.findMemberByIdUseCase.execute(
      step.expectedApproverId,
      actor.companyId,
    );
    const target = await this.findMemberByIdUseCase.execute(
      toMemberId,
      actor.companyId,
    );

    if (target.disabledAt) {
      throw new ValidationError('O destino precisa ser um membro ativo');
    }

    if (target.role === CompanyMemberRole.REQUESTER) {
      throw new ValidationError(
        'O destino precisa ter perfil de aprovação válido (RN33)',
      );
    }

    if (target.id === request.requesterId) {
      throw new ValidationError(
        'O solicitante não pode ser o aprovador do próprio pedido (RN23)',
      );
    }

    if (target.approvalLimitCents < original.approvalLimitCents) {
      throw new ValidationError(
        'O destino precisa ter alçada equivalente à do aprovador original (RN33)',
        {
          originalLimitCents: original.approvalLimitCents.toString(),
          targetLimitCents: target.approvalLimitCents.toString(),
        },
      );
    }

    await this.approvalStepWriter.reassign(step.id, toMemberId);

    await this.auditLogRepository.record({
      companyId: actor.companyId,
      actorId: actor.userId,
      eventType: AuditEventType.REASSIGNED,
      entityType: AuditEntity.PURCHASE_REQUEST,
      entityId: requestId,
      oldData: { expectedApproverId: step.expectedApproverId },
      newData: { expectedApproverId: toMemberId, stepOrder: step.stepOrder },
    });

    await this.tokensRepository.consumeByReferences(
      [step.id],
      TokenType.APPROVAL_ACTION,
    );

    await this.notifyPendingApprovalUseCase.execute({
      companyId: actor.companyId,
      stepId: step.id,
      approverMemberId: toMemberId,
      requesterMemberId: request.requesterId,
      requestId,
      number: request.number,
      title: request.title,
      totalAmountCents: request.totalAmountCents,
    });
  }
}
