import { Injectable } from '@nestjs/common';
import { SupplierEntity } from '../domain/supplier.entity';
import { ISupplierRepository } from '../domain/suppliers.repository.interface';
import { UpdateSupplierDto } from '../dto/update-supplier.dto';
import { FindSupplierByIdUseCase } from './find-supplier-by-id.use-case';

@Injectable()
export class UpdateSupplierUseCase {
  constructor(
    private readonly supplierRepository: ISupplierRepository,
    private readonly findSupplierByIdUseCase: FindSupplierByIdUseCase,
  ) {}

  async execute(
    id: string,
    companyId: string,
    data: UpdateSupplierDto,
  ): Promise<SupplierEntity> {
    await this.findSupplierByIdUseCase.execute(id, companyId);

    return this.supplierRepository.update(id, {
      legalName: data.legalName,
      tradeName: data.tradeName,
      street: data.street,
      city: data.city,
      state: data.state,
      zipCode: data.zipCode,
      email: data.email,
      phone: data.phone,
    });
  }
}
