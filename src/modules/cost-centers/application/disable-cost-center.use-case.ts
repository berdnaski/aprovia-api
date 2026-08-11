import { Injectable } from '@nestjs/common';
import { ITransactionManager } from 'src/shared/domain/transaction.manager';
import {
  CostCenterAlreadyDisabledError,
  CostCenterHasActiveChildrenError,
} from '../domain/cost-centers.errors';
import { ICostCenterRepository } from '../domain/cost-centers.repository.interface';
import { FindCostCenterByIdUseCase } from './find-cost-center-by-id.use-case';

@Injectable()
export class DisableCostCenterUseCase {
  constructor(
    private readonly costCenterRepository: ICostCenterRepository,
    private readonly findCostCenterByIdUseCase: FindCostCenterByIdUseCase,
    private readonly transactionManager: ITransactionManager,
  ) {}

  async execute(id: string, companyId: string): Promise<void> {
    const costCenter = await this.findCostCenterByIdUseCase.execute(
      id,
      companyId,
    );

    if (costCenter.disabledAt) {
      throw new CostCenterAlreadyDisabledError();
    }

    await this.transactionManager.run(async (context) => {
      const activeChildren =
        await this.costCenterRepository.countActiveChildren(id, context);

      if (activeChildren > 0) {
        throw new CostCenterHasActiveChildrenError(activeChildren);
      }

      await this.costCenterRepository.disable(id, context);
    });
  }
}
