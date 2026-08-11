import { Injectable } from '@nestjs/common';
import { ApprovalRuleEntity } from '../domain/approval-rule.entity';
import {
  IApprovalRuleRepository,
  ListApprovalRulesFilter,
} from '../domain/approval-rules.repository.interface';

@Injectable()
export class ListApprovalRulesUseCase {
  constructor(
    private readonly approvalRuleRepository: IApprovalRuleRepository,
  ) {}

  execute(
    companyId: string,
    filter?: ListApprovalRulesFilter,
  ): Promise<ApprovalRuleEntity[]> {
    return this.approvalRuleRepository.listByCompany(companyId, filter);
  }
}
