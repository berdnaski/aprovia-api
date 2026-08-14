import { Module } from '@nestjs/common';
import { AuditModule } from 'src/modules/audit/infrastructure/audit.module';
import { PurchaseRequestsModule } from 'src/modules/purchase-requests/infrastructure/purchase-requests.module';
import { CancelPurchaseOrderUseCase } from '../application/cancel-purchase-order.use-case';
import { FindPurchaseOrderByIdUseCase } from '../application/find-purchase-order-by-id.use-case';
import { GetOrderBalanceUseCase } from '../application/get-order-balance.use-case';
import { IssuePurchaseOrderUseCase } from '../application/issue-purchase-order.use-case';
import { ListPurchaseOrdersUseCase } from '../application/list-purchase-orders.use-case';
import { SendPurchaseOrderUseCase } from '../application/send-purchase-order.use-case';
import { IPurchaseOrderRepository } from '../domain/purchase-orders.repository.interface';
import {
  PurchaseOrdersController,
  RequestPurchaseOrderController,
} from './purchase-orders.controller';
import { PurchaseOrderRepository } from './purchase-orders.repository';

@Module({
  imports: [PurchaseRequestsModule, AuditModule],
  controllers: [PurchaseOrdersController, RequestPurchaseOrderController],
  providers: [
    { provide: IPurchaseOrderRepository, useClass: PurchaseOrderRepository },
    IssuePurchaseOrderUseCase,
    ListPurchaseOrdersUseCase,
    FindPurchaseOrderByIdUseCase,
    SendPurchaseOrderUseCase,
    CancelPurchaseOrderUseCase,
    GetOrderBalanceUseCase,
  ],
  exports: [IPurchaseOrderRepository, FindPurchaseOrderByIdUseCase],
})
export class PurchaseOrdersModule {}
