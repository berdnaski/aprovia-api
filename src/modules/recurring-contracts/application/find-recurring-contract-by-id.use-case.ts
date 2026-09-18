import { Injectable } from '@nestjs/common';
import { RecurringContractEntity } from '../domain/recurring-contract.entity';
import {
  RecurringContractForbiddenError,
  RecurringContractNotFoundError,
} from '../domain/recurring-contracts.errors';
import { IRecurringContractRepository } from '../domain/recurring-contracts.repository.interface';

@Injectable()
export class FindRecurringContractByIdUseCase {
  constructor(
    private readonly recurringContractRepository: IRecurringContractRepository,
  ) {}

  async execute(
    id: string,
    companyId: string,
  ): Promise<RecurringContractEntity> {
    const contract = await this.recurringContractRepository.findById(id);

    if (!contract) {
      throw new RecurringContractNotFoundError(id);
    }

    if (contract.companyId !== companyId) {
      throw new RecurringContractForbiddenError();
    }

    return contract;
  }
}
