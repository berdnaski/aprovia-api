import { Injectable } from '@nestjs/common';
import { ManageRequestAllocationsUseCase } from 'src/modules/purchase-requests/application/manage-request-allocations.use-case';
import { IPurchaseRequestRepository } from 'src/modules/purchase-requests/domain/purchase-requests.repository.interface';
import {
  allocate,
  AllocatedAmount,
} from 'src/modules/purchase-requests/domain/services/allocation-split';
import { TransactionContext } from 'src/shared/domain/transaction.manager';

@Injectable()
export class DerivePayableAllocationsUseCase {
  constructor(
    private readonly purchaseRequestRepository: IPurchaseRequestRepository,
    private readonly manageRequestAllocationsUseCase: ManageRequestAllocationsUseCase,
  ) {}

  async execute(
    purchaseRequestId: string | null,
    amountCents: bigint,
    context?: TransactionContext,
  ): Promise<AllocatedAmount[]> {
    if (!purchaseRequestId) {
      return [];
    }

    const request = await this.purchaseRequestRepository.findById(
      purchaseRequestId,
      context,
    );

    if (!request) {
      return [];
    }

    const { shares } = await this.manageRequestAllocationsUseCase.sharesFor(
      request,
      context,
    );

    return allocate(amountCents, shares);
  }
}
