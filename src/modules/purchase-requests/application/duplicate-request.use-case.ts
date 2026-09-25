import { Injectable } from '@nestjs/common';
import { ITransactionManager } from 'src/shared/domain/transaction.manager';
import { PurchaseRequestEntity } from '../domain/purchase-request.entity';
import { IRequestAllocationRepository } from '../domain/request-allocations.repository.interface';
import { IRequestItemRepository } from '../domain/request-items.repository.interface';
import { IPurchaseRequestRepository } from '../domain/purchase-requests.repository.interface';
import { CreateDraftUseCase } from './create-draft.use-case';
import {
  FindRequestByIdUseCase,
  RequestActor,
} from './find-request-by-id.use-case';

@Injectable()
export class DuplicateRequestUseCase {
  constructor(
    private readonly purchaseRequestRepository: IPurchaseRequestRepository,
    private readonly requestItemRepository: IRequestItemRepository,
    private readonly requestAllocationRepository: IRequestAllocationRepository,
    private readonly findRequestByIdUseCase: FindRequestByIdUseCase,
    private readonly createDraftUseCase: CreateDraftUseCase,
    private readonly transactionManager: ITransactionManager,
  ) {}

  async execute(
    id: string,
    actor: RequestActor,
  ): Promise<PurchaseRequestEntity> {
    const source = await this.findRequestByIdUseCase.execute(id, actor);
    const [items, allocations] = await Promise.all([
      this.requestItemRepository.listByRequest(source.id),
      this.requestAllocationRepository.listByRequest(source.id),
    ]);

    const draft = await this.createDraftUseCase.execute(
      actor.companyId,
      actor.memberId,
      actor.role,
      {
        costCenterId: source.costCenterId ?? undefined,
        categoryId: source.categoryId ?? undefined,
        supplierId: source.supplierId ?? undefined,
        title: `${source.title} (cópia)`,
        description: source.description ?? undefined,
        urgency: source.urgency,
        paymentTerms: source.paymentTerms ?? undefined,
      },
      actor.userId,
    );

    if (items.length === 0 && allocations.length === 0) {
      return draft;
    }

    return this.transactionManager.run(async (context) => {
      await this.requestAllocationRepository.replace(
        draft.id,
        allocations.map((line) => ({
          costCenterId: line.costCenterId,
          chartAccountId: line.chartAccountId,
          shareBps: line.shareBps,
        })),
        context,
      );

      await this.requestItemRepository.createMany(
        items.map((item) => ({
          purchaseRequestId: draft.id,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          unitPriceCents: item.unitPriceCents,
          totalCents: item.totalCents,
        })),
        context,
      );

      const total = await this.requestItemRepository.sumTotal(
        draft.id,
        context,
      );

      await this.purchaseRequestRepository.updateTotal(
        draft.id,
        total,
        context,
      );

      const updated = await this.purchaseRequestRepository.findById(
        draft.id,
        context,
      );

      return updated ?? draft;
    });
  }
}
