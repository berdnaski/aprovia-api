import { Injectable } from '@nestjs/common';
import { Page } from 'src/shared/dto/pagination-query.dto';
import { SupplierEntity } from '../domain/supplier.entity';
import { ISupplierRepository } from '../domain/suppliers.repository.interface';
import { ListSuppliersQueryDto } from '../dto/list-suppliers-query.dto';

@Injectable()
export class ListSuppliersUseCase {
  constructor(private readonly supplierRepository: ISupplierRepository) {}

  execute(
    companyId: string,
    query: ListSuppliersQueryDto,
  ): Promise<Page<SupplierEntity>> {
    return this.supplierRepository.list(companyId, {
      search: query.search,
      registrationStatus: query.registrationStatus,
      validationStatus: query.validationStatus,
      blocked: query.blocked,
      skip: query.skip,
      take: query.take,
    });
  }
}
