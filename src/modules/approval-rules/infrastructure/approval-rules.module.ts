import { Module, forwardRef } from '@nestjs/common';
import { CompaniesModule } from 'src/modules/companies/infrastructure/companies.module';
import { CostCentersModule } from 'src/modules/cost-centers/infrastructure/cost-centers.module';
import { ListApprovalRulesUseCase } from '../application/list-approval-rules.use-case';
import { ReplaceApprovalMatrixUseCase } from '../application/replace-approval-matrix.use-case';
import { ResolveApprovalRuleUseCase } from '../application/resolve-approval-rule.use-case';
import { SimulateRouteUseCase } from '../application/simulate-route.use-case';
import { IApprovalRuleRepository } from '../domain/approval-rules.repository.interface';
import { ApprovalMatrixService } from '../domain/services/approval-matrix.service';
import { ApprovalRulesController } from './approval-rules.controller';
import { ApprovalRuleRepository } from './approval-rules.repository';

@Module({
  imports: [
    forwardRef(() => CostCentersModule),
    forwardRef(() => CompaniesModule),
  ],
  controllers: [ApprovalRulesController],
  providers: [
    { provide: IApprovalRuleRepository, useClass: ApprovalRuleRepository },
    ApprovalMatrixService,
    ListApprovalRulesUseCase,
    ReplaceApprovalMatrixUseCase,
    ResolveApprovalRuleUseCase,
    SimulateRouteUseCase,
  ],
  exports: [
    IApprovalRuleRepository,
    ResolveApprovalRuleUseCase,
    SimulateRouteUseCase,
  ],
})
export class ApprovalRulesModule {}
