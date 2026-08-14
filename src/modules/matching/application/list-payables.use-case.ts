import { Injectable } from '@nestjs/common';
import { Page } from 'src/shared/dto/pagination-query.dto';
import { PayableEntity } from '../domain/payable.entity';
import { IPayableRepository } from '../domain/payables.repository.interface';
import { ListPayablesQueryDto } from '../dto/list-payables-query.dto';

@Injectable()
export class ListPayablesUseCase {
  constructor(private readonly payableRepository: IPayableRepository) {}

  async execute(
    companyId: string,
    query: ListPayablesQueryDto,
  ): Promise<Page<PayableEntity>> {
    return this.payableRepository.list({
      companyId,
      status: query.status,
      supplierId: query.supplierId,
      skip: query.skip,
      take: query.take,
      page: query.page,
      perPage: query.perPage,
    });
  }
}
