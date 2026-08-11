import { Module } from '@nestjs/common';
import { CostCentersModule } from 'src/modules/cost-centers/infrastructure/cost-centers.module';
import { ListApprovalRulesUseCase } from '../application/list-approval-rules.use-case';
import { ReplaceApprovalMatrixUseCase } from '../application/replace-approval-matrix.use-case';
import { ResolveApprovalRuleUseCase } from '../application/resolve-approval-rule.use-case';
import { IApprovalRuleRepository } from '../domain/approval-rules.repository.interface';
import { ApprovalMatrixService } from '../domain/services/approval-matrix.service';
import { ApprovalRulesController } from './approval-rules.controller';
import { ApprovalRuleRepository } from './approval-rules.repository';

@Module({
  imports: [CostCentersModule],
  controllers: [ApprovalRulesController],
  providers: [
    { provide: IApprovalRuleRepository, useClass: ApprovalRuleRepository },
    ApprovalMatrixService,
    ListApprovalRulesUseCase,
    ReplaceApprovalMatrixUseCase,
    ResolveApprovalRuleUseCase,
  ],
  exports: [IApprovalRuleRepository, ResolveApprovalRuleUseCase],
})
export class ApprovalRulesModule {}
