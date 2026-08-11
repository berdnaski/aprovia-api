import { Injectable } from '@nestjs/common';
import { CompanyMemberRole } from 'generated/prisma/enums';
import { CompanyMemberEntity } from 'src/modules/companies/domain/company-member.entity';
import { ICompanyMemberRepository } from 'src/modules/companies/domain/company-members.repository.interface';
import { TransactionContext } from 'src/shared/domain/transaction.manager';
import { InvalidCostCenterManagerError } from '../cost-centers.errors';

const MANAGER_ROLES: CompanyMemberRole[] = [
  CompanyMemberRole.APPROVER,
  CompanyMemberRole.FINANCE_ADMIN,
];

@Injectable()
export class CostCenterManagerService {
  constructor(
    private readonly companyMemberRepository: ICompanyMemberRepository,
  ) {}

  async assertEligible(
    managerId: string,
    companyId: string,
    context?: TransactionContext,
  ): Promise<CompanyMemberEntity> {
    const manager = await this.companyMemberRepository.findById(
      managerId,
      context,
    );

    if (
      !manager ||
      manager.companyId !== companyId ||
      manager.disabledAt !== null ||
      !MANAGER_ROLES.includes(manager.role)
    ) {
      throw new InvalidCostCenterManagerError();
    }

    return manager;
  }
}
