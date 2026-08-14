import { Module } from '@nestjs/common';
import { AuditModule } from 'src/modules/audit/infrastructure/audit.module';
import { PurchaseOrdersModule } from 'src/modules/purchase-orders/infrastructure/purchase-orders.module';
import { PurchaseRequestsModule } from 'src/modules/purchase-requests/infrastructure/purchase-requests.module';
import { FindReceiptByIdUseCase } from '../application/find-receipt-by-id.use-case';
import { ListReceiptsUseCase } from '../application/list-receipts.use-case';
import { RegisterReceiptUseCase } from '../application/register-receipt.use-case';
import { IReceiptRepository } from '../domain/receipts.repository.interface';
import {
  OrderReceiptsController,
  ReceiptsController,
} from './receipts.controller';
import { ReceiptRepository } from './receipts.repository';

@Module({
  imports: [PurchaseOrdersModule, PurchaseRequestsModule, AuditModule],
  controllers: [OrderReceiptsController, ReceiptsController],
  providers: [
    { provide: IReceiptRepository, useClass: ReceiptRepository },
    RegisterReceiptUseCase,
    ListReceiptsUseCase,
    FindReceiptByIdUseCase,
  ],
  exports: [IReceiptRepository],
})
export class ReceiptsModule {}
