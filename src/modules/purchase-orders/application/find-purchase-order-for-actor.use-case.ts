import { Injectable } from '@nestjs/common';
import {
  FindRequestByIdUseCase,
  RequestActor,
} from 'src/modules/purchase-requests/application/find-request-by-id.use-case';
import { PurchaseOrderEntity } from '../domain/purchase-order.entity';
import { PurchaseOrderNotOwnedError } from '../domain/purchase-orders.errors';
import { purchaseOrderScopeFor } from '../domain/services/purchase-order-access.service';
import { FindPurchaseOrderByIdUseCase } from './find-purchase-order-by-id.use-case';

@Injectable()
export class FindPurchaseOrderForActorUseCase {
  constructor(
    private readonly findPurchaseOrderByIdUseCase: FindPurchaseOrderByIdUseCase,
    private readonly findRequestByIdUseCase: FindRequestByIdUseCase,
  ) {}

  async execute(id: string, actor: RequestActor): Promise<PurchaseOrderEntity> {
    const order = await this.findPurchaseOrderByIdUseCase.execute(
      id,
      actor.companyId,
    );

    const scope = purchaseOrderScopeFor(actor.role, actor.memberId);

    if (!scope) {
      return order;
    }

    const request = await this.findRequestByIdUseCase.execute(
      order.purchaseRequestId,
      actor,
    );

    if (request.requesterId !== scope) {
      throw new PurchaseOrderNotOwnedError();
    }

    return order;
  }
}
