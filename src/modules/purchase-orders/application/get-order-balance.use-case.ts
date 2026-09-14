import { Injectable } from '@nestjs/common';
import { RequestActor } from 'src/modules/purchase-requests/application/find-request-by-id.use-case';
import { pendingQuantity } from '../domain/services/purchase-order-status.service';
import { ItemBalance } from '../domain/purchase-orders.repository.interface';
import { IPurchaseOrderRepository } from '../domain/purchase-orders.repository.interface';
import { FindPurchaseOrderForActorUseCase } from './find-purchase-order-for-actor.use-case';

@Injectable()
export class GetOrderBalanceUseCase {
  constructor(
    private readonly purchaseOrderRepository: IPurchaseOrderRepository,
    private readonly findPurchaseOrderForActorUseCase: FindPurchaseOrderForActorUseCase,
  ) {}

  async execute(id: string, actor: RequestActor): Promise<ItemBalance[]> {
    await this.findPurchaseOrderForActorUseCase.execute(id, actor);

    const items = await this.purchaseOrderRepository.listItems(id);

    return items.map((item) => ({
      itemId: item.id,
      description: item.description,
      unit: item.unit,
      orderedQuantity: item.quantity,
      receivedQuantity: item.receivedQuantity,
      pendingQuantity: pendingQuantity({
        orderedQuantity: item.quantity,
        receivedQuantity: item.receivedQuantity,
      }),
    }));
  }
}
