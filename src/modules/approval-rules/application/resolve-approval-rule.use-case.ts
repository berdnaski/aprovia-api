import { Injectable } from '@nestjs/common';
import { TransactionContext } from 'src/shared/domain/transaction.manager';
import { ApprovalRuleEntity } from '../domain/approval-rule.entity';
import { IApprovalRuleRepository } from '../domain/approval-rules.repository.interface';
import { ApprovalMatrixService } from '../domain/services/approval-matrix.service';

export interface ResolveApprovalRuleInput {
  amountCents: bigint;
  costCenterId: string | null;
  categoryId: string | null;
}

@Injectable()
export class ResolveApprovalRuleUseCase {
  constructor(
    private readonly approvalRuleRepository: IApprovalRuleRepository,
    private readonly approvalMatrixService: ApprovalMatrixService,
  ) {}

  async execute(
    companyId: string,
    input: ResolveApprovalRuleInput,
    context?: TransactionContext,
  ): Promise<ApprovalRuleEntity> {
    const rules = await this.approvalRuleRepository.listByCompany(
      companyId,
      {},
      context,
    );

    return this.approvalMatrixService.resolve(
      rules,
      input.amountCents,
      input.costCenterId,
      input.categoryId,
    );
  }
}
