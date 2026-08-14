import { Injectable } from '@nestjs/common';
import { ReceiptEntity } from '../domain/receipt.entity';
import { ReceiptNotFoundError } from '../domain/receipts.errors';
import { IReceiptRepository } from '../domain/receipts.repository.interface';

@Injectable()
export class FindReceiptByIdUseCase {
  constructor(private readonly receiptRepository: IReceiptRepository) {}

  async execute(id: string, companyId: string): Promise<ReceiptEntity> {
    const receipt = await this.receiptRepository.findById(id, companyId);

    if (!receipt) {
      throw new ReceiptNotFoundError();
    }

    return receipt;
  }
}
