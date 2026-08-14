import { Injectable } from '@nestjs/common';
import { Page } from 'src/shared/dto/pagination-query.dto';
import { ListPurchaseOrdersQueryDto } from '../dto/list-purchase-orders-query.dto';
import { PurchaseOrderEntity } from '../domain/purchase-order.entity';
import { IPurchaseOrderRepository } from '../domain/purchase-orders.repository.interface';

@Injectable()
export class ListPurchaseOrdersUseCase {
  constructor(
    private readonly purchaseOrderRepository: IPurchaseOrderRepository,
  ) {}

  async execute(
    companyId: string,
    query: ListPurchaseOrdersQueryDto,
  ): Promise<Page<PurchaseOrderEntity>> {
    return this.purchaseOrderRepository.list({
      companyId,
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
