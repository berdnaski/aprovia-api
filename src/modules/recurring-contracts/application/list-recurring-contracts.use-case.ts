import { Injectable } from '@nestjs/common';
import { RecurringContractEntity } from '../domain/recurring-contract.entity';
import {
  IRecurringContractRepository,
  ListRecurringContractsFilter,
} from '../domain/recurring-contracts.repository.interface';

@Injectable()
export class ListRecurringContractsUseCase {
  constructor(
    private readonly recurringContractRepository: IRecurringContractRepository,
  ) {}

  execute(
    companyId: string,
    filter?: ListRecurringContractsFilter,
  ): Promise<RecurringContractEntity[]> {
    return this.recurringContractRepository.list(companyId, filter);
  }
}
