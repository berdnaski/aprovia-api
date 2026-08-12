import { Injectable } from '@nestjs/common';
import { NotFoundError } from 'src/shared/domain/errors/domain.error';
import { ITransactionManager } from 'src/shared/domain/transaction.manager';
import { RequestItemEntity } from '../domain/request-item.entity';
import { IRequestItemRepository } from '../domain/request-items.repository.interface';
import { IPurchaseRequestRepository } from '../domain/purchase-requests.repository.interface';
import { RequestItemDto } from '../dto/request-item.dto';
import {
  FindRequestByIdUseCase,
  RequestActor,
} from './find-request-by-id.use-case';

function lineTotal(quantity: string, unitPriceCents: bigint): bigint {
  const [whole, fraction = ''] = quantity.split('.');
  const scaled = BigInt(`${whole}${fraction.padEnd(3, '0').slice(0, 3)}`);

  return (scaled * unitPriceCents) / 1000n;
}

@Injectable()
export class ManageRequestItemsUseCase {
  constructor(
    private readonly requestItemRepository: IRequestItemRepository,
    private readonly purchaseRequestRepository: IPurchaseRequestRepository,
    private readonly findRequestByIdUseCase: FindRequestByIdUseCase,
    private readonly transactionManager: ITransactionManager,
  ) {}

  list(requestId: string, actor: RequestActor): Promise<RequestItemEntity[]> {
    return this.findRequestByIdUseCase
      .execute(requestId, actor)
      .then(() => this.requestItemRepository.listByRequest(requestId));
  }

  async add(
    requestId: string,
    actor: RequestActor,
    data: RequestItemDto,
  ): Promise<RequestItemEntity> {
    await this.findRequestByIdUseCase.executeAsOwnerDraft(requestId, actor);

    return this.transactionManager.run(async (context) => {
      const item = await this.requestItemRepository.create(
        {
          purchaseRequestId: requestId,
          description: data.description,
          quantity: data.quantity,
          unit: data.unit,
          unitPriceCents: data.unitPriceCents,
          totalCents: lineTotal(data.quantity, data.unitPriceCents),
        },
        context,
      );

      await this.recalculateTotal(requestId, context);

      return item;
    });
  }

  async update(
    requestId: string,
    itemId: string,
    actor: RequestActor,
    data: RequestItemDto,
  ): Promise<RequestItemEntity> {
    await this.findRequestByIdUseCase.executeAsOwnerDraft(requestId, actor);

    return this.transactionManager.run(async (context) => {
      const existing = await this.requestItemRepository.findById(
        itemId,
        context,
      );

      if (!existing || existing.purchaseRequestId !== requestId) {
        throw new NotFoundError('Item do pedido', itemId);
      }

      const item = await this.requestItemRepository.update(
        itemId,
        {
          description: data.description,
          quantity: data.quantity,
          unit: data.unit,
          unitPriceCents: data.unitPriceCents,
          totalCents: lineTotal(data.quantity, data.unitPriceCents),
        },
        context,
      );

      await this.recalculateTotal(requestId, context);

      return item;
    });
  }

  async remove(
    requestId: string,
    itemId: string,
    actor: RequestActor,
  ): Promise<void> {
    await this.findRequestByIdUseCase.executeAsOwnerDraft(requestId, actor);

    await this.transactionManager.run(async (context) => {
      const existing = await this.requestItemRepository.findById(
        itemId,
        context,
      );

      if (!existing || existing.purchaseRequestId !== requestId) {
        throw new NotFoundError('Item do pedido', itemId);
      }

      await this.requestItemRepository.delete(itemId, context);
      await this.recalculateTotal(requestId, context);
    });
  }

  private async recalculateTotal(
    requestId: string,
    context: Parameters<Parameters<ITransactionManager['run']>[0]>[0],
  ): Promise<void> {
    const total = await this.requestItemRepository.sumTotal(requestId, context);

    await this.purchaseRequestRepository.updateTotal(requestId, total, context);
  }
}
