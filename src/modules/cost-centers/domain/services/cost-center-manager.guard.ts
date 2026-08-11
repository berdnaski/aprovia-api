import { Injectable } from '@nestjs/common';
import {
  IMemberResponsibilityGuard,
  MemberAction,
  ResponsibilityBlocker,
  ResponsibilityBlockerKind,
} from 'src/modules/companies/domain/member-responsibility-guard';
import { TransactionContext } from 'src/shared/domain/transaction.manager';
import { ICostCenterRepository } from '../cost-centers.repository.interface';

@Injectable()
export class CostCenterManagerGuard implements IMemberResponsibilityGuard {
  readonly blocks = [MemberAction.DEACTIVATE, MemberAction.DEMOTE] as const;

  constructor(private readonly costCenterRepository: ICostCenterRepository) {}

  async check(
    memberId: string,
    companyId: string,
    context?: TransactionContext,
  ): Promise<ResponsibilityBlocker | null> {
    const managed = await this.costCenterRepository.listManagedBy(
      memberId,
      context,
    );

    const owned = managed.filter(
      (costCenter) => costCenter.companyId === companyId,
    );

    if (owned.length === 0) {
      return null;
    }

    return {
      kind: ResponsibilityBlockerKind.COST_CENTER_MANAGER,
      message:
        owned.length === 1
          ? 'é gestor de 1 Centro de Custo'
          : `é gestor de ${owned.length} Centros de Custo`,
      items: owned.map((costCenter) => ({
        id: costCenter.id,
        label: costCenter.name,
        details: { code: costCenter.code },
      })),
    };
  }
}
