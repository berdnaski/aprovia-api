import { Injectable } from '@nestjs/common';
import { SupplierEntity } from '../domain/supplier.entity';
import { ISupplierRepository } from '../domain/suppliers.repository.interface';
import { FindSupplierByIdUseCase } from './find-supplier-by-id.use-case';

@Injectable()
export class SetSupplierBlockedUseCase {
  constructor(
    private readonly supplierRepository: ISupplierRepository,
    private readonly findSupplierByIdUseCase: FindSupplierByIdUseCase,
  ) {}

  async execute(
    id: string,
    companyId: string,
    blocked: boolean,
  ): Promise<SupplierEntity> {
    const supplier = await this.findSupplierByIdUseCase.execute(id, companyId);

    if (supplier.blocked === blocked) {
      return supplier;
    }

    return this.supplierRepository.setBlocked(id, blocked);
  }
}
