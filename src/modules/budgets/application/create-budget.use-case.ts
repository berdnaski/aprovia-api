import { Injectable } from '@nestjs/common';
import { FindCostCenterByIdUseCase } from 'src/modules/cost-centers/application/find-cost-center-by-id.use-case';
import { isUniqueViolation } from 'src/shared/domain/prisma-error';
import { ITransactionManager } from 'src/shared/domain/transaction.manager';
import { BudgetEntity } from '../domain/budget.entity';
import {
  BudgetPeriodOverlapError,
  BudgetPeriodTakenError,
  InactiveCostCenterBudgetError,
  NegativeBudgetError,
} from '../domain/budgets.errors';
import { IBudgetRepository } from '../domain/budgets.repository.interface';
import {
  BudgetPeriodService,
  BudgetPeriodType,
} from '../domain/services/budget-period.service';
import { CreateBudgetDto } from '../dto/create-budget.dto';

@Injectable()
export class CreateBudgetUseCase {
  constructor(
    private readonly budgetRepository: IBudgetRepository,
    private readonly findCostCenterByIdUseCase: FindCostCenterByIdUseCase,
    private readonly budgetPeriodService: BudgetPeriodService,
    private readonly transactionManager: ITransactionManager,
  ) {}

  async execute(
    costCenterId: string,
    companyId: string,
    data: CreateBudgetDto,
  ): Promise<BudgetEntity> {
    const costCenter = await this.findCostCenterByIdUseCase.execute(
      costCenterId,
      companyId,
    );

    if (costCenter.disabledAt) {
      throw new InactiveCostCenterBudgetError();
    }

    if (data.totalAmountCents < 0n) {
      throw new NegativeBudgetError();
    }

    const period = this.budgetPeriodService.fromMonthKey(
      data.period,
      data.periodType ?? BudgetPeriodType.MONTHLY,
    );

    try {
      return await this.transactionManager.run(async (context) => {
        const overlapping = await this.budgetRepository.findOverlapping(
          costCenterId,
          period.periodStart,
          period.periodEnd,
          context,
        );

        if (overlapping) {
          throw new BudgetPeriodOverlapError(
            overlapping.periodStart,
            overlapping.periodEnd,
          );
        }

        return this.budgetRepository.create(
          {
            costCenterId,
            periodStart: period.periodStart,
            periodEnd: period.periodEnd,
            totalAmountCents: data.totalAmountCents,
          },
          context,
        );
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new BudgetPeriodTakenError(period.periodStart);
      }
      throw error;
    }
  }
}
