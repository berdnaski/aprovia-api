import { Injectable } from '@nestjs/common';
import {
  ForbiddenError,
  NotFoundError,
} from 'src/shared/domain/errors/domain.error';
import { TransactionContext } from 'src/shared/domain/transaction.manager';
import { SupplierEntity } from '../domain/supplier.entity';
import { ISupplierRepository } from '../domain/suppliers.repository.interface';

@Injectable()
export class FindSupplierByIdUseCase {
  constructor(private readonly supplierRepository: ISupplierRepository) {}

  async execute(
    id: string,
    companyId: string,
    context?: TransactionContext,
  ): Promise<SupplierEntity> {
    const supplier = await this.supplierRepository.findById(id, context);

    if (!supplier) {
      throw new NotFoundError('Fornecedor', id);
    }

    if (supplier.companyId !== companyId) {
      throw new ForbiddenError('Este fornecedor pertence a outra empresa');
    }

    return supplier;
  }
}
