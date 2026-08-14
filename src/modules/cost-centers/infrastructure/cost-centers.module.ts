import { Module, forwardRef, OnModuleInit } from '@nestjs/common';
import { CompaniesModule } from 'src/modules/companies/infrastructure/companies.module';
import { MemberResponsibilityRegistry } from 'src/modules/companies/domain/services/member-responsibility.registry';
import { CreateCostCenterUseCase } from '../application/create-cost-center.use-case';
import { DeleteCostCenterUseCase } from '../application/delete-cost-center.use-case';
import { DisableCostCenterUseCase } from '../application/disable-cost-center.use-case';
import { FindCostCenterByIdUseCase } from '../application/find-cost-center-by-id.use-case';
import { LinkCostCenterMemberUseCase } from '../application/link-cost-center-member.use-case';
import { ListCostCenterMembersUseCase } from '../application/list-cost-center-members.use-case';
import { ListCostCentersUseCase } from '../application/list-cost-centers.use-case';
import { TransferCostCenterManagementUseCase } from '../application/transfer-cost-center-management.use-case';
import { UnlinkCostCenterMemberUseCase } from '../application/unlink-cost-center-member.use-case';
import { UpdateCostCenterUseCase } from '../application/update-cost-center.use-case';
import { ICostCenterMemberRepository } from '../domain/cost-center-members.repository.interface';
import { ICostCenterRepository } from '../domain/cost-centers.repository.interface';
import { CostCenterHierarchyService } from '../domain/services/cost-center-hierarchy.service';
import { CostCenterManagerGuard } from '../domain/services/cost-center-manager.guard';
import { CostCenterAccessService } from '../domain/services/cost-center-access.service';
import { CostCenterManagerService } from '../domain/services/cost-center-manager.service';
import { CostCenterMemberRepository } from './cost-center-members.repository';
import { CostCentersController } from './cost-centers.controller';
import { CostCenterRepository } from './cost-centers.repository';

@Module({
  imports: [forwardRef(() => CompaniesModule)],
  controllers: [CostCentersController],
  providers: [
    { provide: ICostCenterRepository, useClass: CostCenterRepository },
    {
      provide: ICostCenterMemberRepository,
      useClass: CostCenterMemberRepository,
    },
    CostCenterHierarchyService,
    CostCenterManagerService,
    CostCenterManagerGuard,
    CostCenterAccessService,
    CreateCostCenterUseCase,
    ListCostCentersUseCase,
    FindCostCenterByIdUseCase,
    UpdateCostCenterUseCase,
    DisableCostCenterUseCase,
    DeleteCostCenterUseCase,
    ListCostCenterMembersUseCase,
    LinkCostCenterMemberUseCase,
    UnlinkCostCenterMemberUseCase,
    TransferCostCenterManagementUseCase,
  ],
  exports: [
    ICostCenterRepository,
    ICostCenterMemberRepository,
    FindCostCenterByIdUseCase,
    CostCenterAccessService,
  ],
})
export class CostCentersModule implements OnModuleInit {
  constructor(
    private readonly responsibilityRegistry: MemberResponsibilityRegistry,
    private readonly costCenterManagerGuard: CostCenterManagerGuard,
  ) {}

  onModuleInit(): void {
    this.responsibilityRegistry.register(this.costCenterManagerGuard);
  }
}
