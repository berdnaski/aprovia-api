import { Injectable } from '@nestjs/common';
import { RecurringContractOccurrenceEntity } from '../domain/recurring-contract-occurrence.entity';
import { IRecurringOccurrenceRepository } from '../domain/recurring-occurrences.repository.interface';
import { FindRecurringContractByIdUseCase } from './find-recurring-contract-by-id.use-case';

@Injectable()
export class ListOccurrencesUseCase {
  constructor(
    private readonly recurringOccurrenceRepository: IRecurringOccurrenceRepository,
    private readonly findRecurringContractByIdUseCase: FindRecurringContractByIdUseCase,
  ) {}

  async execute(
    contractId: string,
    companyId: string,
  ): Promise<RecurringContractOccurrenceEntity[]> {
    await this.findRecurringContractByIdUseCase.execute(contractId, companyId);

    return this.recurringOccurrenceRepository.listByContract(contractId);
  }
}
