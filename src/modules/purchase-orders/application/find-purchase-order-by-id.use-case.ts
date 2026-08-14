import { Injectable } from '@nestjs/common';
import { TransactionContext } from 'src/shared/domain/transaction.manager';
import { PurchaseOrderEntity } from '../domain/purchase-order.entity';
import { PurchaseOrderNotFoundError } from '../domain/purchase-orders.errors';
import { IPurchaseOrderRepository } from '../domain/purchase-orders.repository.interface';

@Injectable()
export class FindPurchaseOrderByIdUseCase {
  constructor(
    private readonly purchaseOrderRepository: IPurchaseOrderRepository,
  ) {}

  async execute(
    id: string,
    companyId: string,
    context?: TransactionContext,
  ): Promise<PurchaseOrderEntity> {
    const order = await this.purchaseOrderRepository.findById(
      id,
      companyId,
      context,
    );

    if (!order) {
      throw new PurchaseOrderNotFoundError();
    }

    return order;
  }
}
