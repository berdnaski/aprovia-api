import { Injectable } from '@nestjs/common';
import { FindCompanyByIdUseCase } from 'src/modules/companies/application/find-company-by-id.use-case';
import { TransactionContext } from 'src/shared/domain/transaction.manager';
import { BudgetAssessment } from '../domain/services/budget-balance.service';
import { BudgetBalanceService } from '../domain/services/budget-balance.service';
import { GetBudgetConsumptionUseCase } from './get-budget-consumption.use-case';

@Injectable()
export class AssessBudgetAvailabilityUseCase {
  constructor(
    private readonly getBudgetConsumptionUseCase: GetBudgetConsumptionUseCase,
    private readonly findCompanyByIdUseCase: FindCompanyByIdUseCase,
    private readonly budgetBalanceService: BudgetBalanceService,
  ) {}

  async execute(
    costCenterId: string,
    companyId: string,
    amountCents: bigint,
    reference?: Date,
    context?: TransactionContext,
  ): Promise<BudgetAssessment> {
    const balance = await this.getBudgetConsumptionUseCase.execute(
      costCenterId,
      companyId,
      reference,
      context,
    );

    const company = await this.findCompanyByIdUseCase.execute(companyId);

    return this.budgetBalanceService.assess(
      balance,
      amountCents,
      company.overrunTolerancePercent,
    );
  }
}
