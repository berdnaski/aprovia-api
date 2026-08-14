import { Injectable } from '@nestjs/common';
import { CompanyMemberRole } from 'generated/prisma/enums';
import { ICostCenterMemberRepository } from '../cost-center-members.repository.interface';
import { CostCenterEntity } from '../cost-center.entity';
import { CostCenterNotAssignedError } from '../cost-centers.errors';

@Injectable()
export class CostCenterAccessService {
  constructor(
    private readonly costCenterMemberRepository: ICostCenterMemberRepository,
  ) {}

  async assertCanRequest(
    costCenter: CostCenterEntity,
    memberId: string,
    role: CompanyMemberRole,
  ): Promise<void> {
    if (role === CompanyMemberRole.FINANCE_ADMIN) {
      return;
    }

    if (costCenter.managerId === memberId) {
      return;
    }

    const link = await this.costCenterMemberRepository.findLink(
      costCenter.id,
      memberId,
    );

    if (!link) {
      throw new CostCenterNotAssignedError();
    }
  }
}
