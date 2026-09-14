import { Injectable } from '@nestjs/common';
import { RequestActor } from 'src/modules/purchase-requests/application/find-request-by-id.use-case';
import { Page } from 'src/shared/dto/pagination-query.dto';
import { ListPurchaseOrdersQueryDto } from '../dto/list-purchase-orders-query.dto';
import { PurchaseOrderEntity } from '../domain/purchase-order.entity';
import { IPurchaseOrderRepository } from '../domain/purchase-orders.repository.interface';
import { purchaseOrderScopeFor } from '../domain/services/purchase-order-access.service';

@Injectable()
export class ListPurchaseOrdersUseCase {
  constructor(
    private readonly purchaseOrderRepository: IPurchaseOrderRepository,
  ) {}

  async execute(
    actor: RequestActor,
    query: ListPurchaseOrdersQueryDto,
  ): Promise<Page<PurchaseOrderEntity>> {
    return this.purchaseOrderRepository.list({
      companyId: actor.companyId,
      requesterId: purchaseOrderScopeFor(actor.role, actor.memberId),
      status: query.status,
      supplierId: query.supplierId,
      search: query.search,
      skip: query.skip,
      take: query.take,
      page: query.page,
      perPage: query.perPage,
    });
  }
}
