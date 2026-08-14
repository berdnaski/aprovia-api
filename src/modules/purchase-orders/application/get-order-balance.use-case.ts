import { Injectable } from '@nestjs/common';
import { pendingQuantity } from '../domain/services/purchase-order-status.service';
import { ItemBalance } from '../domain/purchase-orders.repository.interface';
import { IPurchaseOrderRepository } from '../domain/purchase-orders.repository.interface';
import { FindPurchaseOrderByIdUseCase } from './find-purchase-order-by-id.use-case';

@Injectable()
export class GetOrderBalanceUseCase {
  constructor(
    private readonly purchaseOrderRepository: IPurchaseOrderRepository,
    private readonly findPurchaseOrderByIdUseCase: FindPurchaseOrderByIdUseCase,
  ) {}

  async execute(id: string, companyId: string): Promise<ItemBalance[]> {
    await this.findPurchaseOrderByIdUseCase.execute(id, companyId);

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
