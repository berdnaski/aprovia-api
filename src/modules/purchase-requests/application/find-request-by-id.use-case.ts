import { Injectable } from '@nestjs/common';
import { CompanyMemberRole } from 'generated/prisma/enums';
import { NotFoundError } from 'src/shared/domain/errors/domain.error';
import { TransactionContext } from 'src/shared/domain/transaction.manager';
import { IApprovalStepWriter } from '../domain/approval-steps.writer';
import { PurchaseRequestEntity } from '../domain/purchase-request.entity';
import {
  RequestNotDraftError,
  RequestNotOwnedError,
  RequestNotVisibleError,
} from '../domain/purchase-requests.errors';
import { IPurchaseRequestRepository } from '../domain/purchase-requests.repository.interface';
import {
  resolveVisibility,
  VisibilityScope,
} from '../domain/services/request-visibility.service';

export interface RequestActor {
  memberId: string;
  userId: string;
  companyId: string;
  role: CompanyMemberRole;
}

@Injectable()
export class FindRequestByIdUseCase {
  constructor(
    private readonly purchaseRequestRepository: IPurchaseRequestRepository,
    private readonly approvalStepWriter: IApprovalStepWriter,
  ) {}

  async execute(
    id: string,
    actor: RequestActor,
    context?: TransactionContext,
  ): Promise<PurchaseRequestEntity> {
    const request = await this.purchaseRequestRepository.findById(id, context);

    if (!request || request.companyId !== actor.companyId) {
      throw new NotFoundError('Pedido', id);
    }

    await this.assertVisible(request, actor);

    return request;
  }

  async executeAsOwnerDraft(
    id: string,
    actor: RequestActor,
    context?: TransactionContext,
  ): Promise<PurchaseRequestEntity> {
    const request = await this.execute(id, actor, context);

    if (request.requesterId !== actor.memberId) {
      throw new RequestNotOwnedError();
    }

    if (!request.isDraft) {
      throw new RequestNotDraftError(request.number, request.status);
    }

    return request;
  }

  private async assertVisible(
    request: PurchaseRequestEntity,
    actor: RequestActor,
  ): Promise<void> {
    const visibility = resolveVisibility(
      actor.memberId,
      actor.companyId,
      actor.role,
    );

    if (visibility.scope === VisibilityScope.COMPANY_WIDE) {
      return;
    }

    if (request.requesterId === actor.memberId) {
      return;
    }

    if (visibility.scope === VisibilityScope.OWN) {
      throw new RequestNotVisibleError();
    }

    const managedCostCenterIds =
      await this.purchaseRequestRepository.listManagedCostCenterIds(
        actor.memberId,
        actor.companyId,
      );

    if (managedCostCenterIds.includes(request.costCenterId)) {
      return;
    }

    const assigned = await this.approvalStepWriter.isAssignedApprover(
      request.id,
      actor.memberId,
    );

    if (!assigned) {
      throw new RequestNotVisibleError();
    }
  }
}
