import { Module, forwardRef } from '@nestjs/common';
import { ApprovalRulesModule } from 'src/modules/approval-rules/infrastructure/approval-rules.module';
import { AuthModule } from 'src/modules/auth/infrastructure/auth.module';
import { CostCentersModule } from 'src/modules/cost-centers/infrastructure/cost-centers.module';
import { SuppliersModule } from 'src/modules/suppliers/infrastructure/suppliers.module';
import { UsersModule } from 'src/modules/users/infrastructure/users.module';
import { CreateCompanyUseCase } from '../application/create-company.use-case';
import { FindActiveMembershipUseCase } from '../application/find-active-membership.use-case';
import { DisableMemberUseCase } from '../application/disable-member.use-case';
import { FindCompanyByIdUseCase } from '../application/find-company-by-id.use-case';
import { FindMemberByIdUseCase } from '../application/find-member-by-id.use-case';
import { GetMemberResponsibilitiesUseCase } from '../application/get-member-responsibilities.use-case';
import { LookupCompanyCnpjUseCase } from '../application/lookup-company-cnpj.use-case';
import { ManageOnboardingUseCase } from '../application/manage-onboarding.use-case';
import { ListCompanyMembersUseCase } from '../application/list-company-members.use-case';
import { SetMemberManagerUseCase } from '../application/set-member-manager.use-case';
import { SetMemberSubstituteUseCase } from '../application/set-member-substitute.use-case';
import { UpdateCompanyPolicyUseCase } from '../application/update-company-policy.use-case';
import { UpdateCompanyUseCase } from '../application/update-company.use-case';
import { UpdateMemberLimitUseCase } from '../application/update-member-limit.use-case';
import { UpdateMemberRoleUseCase } from '../application/update-member-role.use-case';
import { ICompanyRepository } from '../domain/companies.repository.interface';
import { ICompanyMemberRepository } from '../domain/company-members.repository.interface';
import { HierarchyService } from '../domain/services/hierarchy.service';
import { MemberResponsibilityRegistry } from '../domain/services/member-responsibility.registry';
import { CompaniesController } from './companies.controller';
import { CompanyRepository } from './companies.repository';
import { CompanyMembersController } from './company-members.controller';
import { CompanyMemberRepository } from './company-members.repository';
import { OnboardingController } from './onboarding.controller';

@Module({
  imports: [
    forwardRef(() => UsersModule),
    forwardRef(() => AuthModule),
    forwardRef(() => CostCentersModule),
    forwardRef(() => ApprovalRulesModule),
    SuppliersModule,
  ],
  controllers: [
    CompaniesController,
    CompanyMembersController,
    OnboardingController,
  ],
  providers: [
    { provide: ICompanyRepository, useClass: CompanyRepository },
    { provide: ICompanyMemberRepository, useClass: CompanyMemberRepository },
    HierarchyService,
    MemberResponsibilityRegistry,
    CreateCompanyUseCase,
    FindActiveMembershipUseCase,
    FindCompanyByIdUseCase,
    UpdateCompanyUseCase,
    UpdateCompanyPolicyUseCase,
    ListCompanyMembersUseCase,
    FindMemberByIdUseCase,
    UpdateMemberRoleUseCase,
    UpdateMemberLimitUseCase,
    SetMemberManagerUseCase,
    SetMemberSubstituteUseCase,
    DisableMemberUseCase,
    GetMemberResponsibilitiesUseCase,
    ManageOnboardingUseCase,
    LookupCompanyCnpjUseCase,
  ],
  exports: [
    ICompanyMemberRepository,
    FindMemberByIdUseCase,
    FindActiveMembershipUseCase,
    FindCompanyByIdUseCase,
    MemberResponsibilityRegistry,
    ManageOnboardingUseCase,
  ],
})
export class CompaniesModule {}
