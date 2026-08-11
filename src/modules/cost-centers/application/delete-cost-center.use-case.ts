import { Injectable } from '@nestjs/common';
import { ITransactionManager } from 'src/shared/domain/transaction.manager';
import {
  CostCenterInUseError,
  CostCenterUsageBreakdown,
} from '../domain/cost-centers.errors';
import {
  COST_CENTER_USAGE_KINDS,
  ICostCenterRepository,
} from '../domain/cost-centers.repository.interface';
import { FindCostCenterByIdUseCase } from './find-cost-center-by-id.use-case';

@Injectable()
export class DeleteCostCenterUseCase {
  constructor(
    private readonly costCenterRepository: ICostCenterRepository,
    private readonly findCostCenterByIdUseCase: FindCostCenterByIdUseCase,
    private readonly transactionManager: ITransactionManager,
  ) {}

  async execute(id: string, companyId: string): Promise<void> {
    await this.findCostCenterByIdUseCase.execute(id, companyId);

    await this.transactionManager.run(async (context) => {
      const usage = await this.costCenterRepository.findUsage(id, context);

      const breakdown: CostCenterUsageBreakdown = {};

      for (const kind of COST_CENTER_USAGE_KINDS) {
        if (usage[kind] > 0) {
          breakdown[kind] = usage[kind];
        }
      }

      if (Object.keys(breakdown).length > 0) {
        throw new CostCenterInUseError(breakdown);
      }

      await this.costCenterRepository.delete(id, context);
    });
  }
}
