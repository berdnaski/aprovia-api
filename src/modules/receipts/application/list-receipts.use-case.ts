import { Injectable } from '@nestjs/common';
import { FindPurchaseOrderByIdUseCase } from 'src/modules/purchase-orders/application/find-purchase-order-by-id.use-case';
import { ReceiptEntity } from '../domain/receipt.entity';
import { IReceiptRepository } from '../domain/receipts.repository.interface';

@Injectable()
export class ListReceiptsUseCase {
  constructor(
    private readonly receiptRepository: IReceiptRepository,
    private readonly findPurchaseOrderByIdUseCase: FindPurchaseOrderByIdUseCase,
  ) {}

  async execute(
    purchaseOrderId: string,
    companyId: string,
  ): Promise<ReceiptEntity[]> {
    await this.findPurchaseOrderByIdUseCase.execute(purchaseOrderId, companyId);

    return this.receiptRepository.listByOrder(purchaseOrderId);
  }
}
