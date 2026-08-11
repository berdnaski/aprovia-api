import { Injectable } from '@nestjs/common';
import { FindMemberByIdUseCase } from 'src/modules/companies/application/find-member-by-id.use-case';
import { ValidationError } from 'src/shared/domain/errors/domain.error';
import { ITransactionManager } from 'src/shared/domain/transaction.manager';
import { CostCenterEntity } from '../domain/cost-center.entity';
import { ICostCenterMemberRepository } from '../domain/cost-center-members.repository.interface';
import { ICostCenterRepository } from '../domain/cost-centers.repository.interface';
import { CostCenterManagerService } from '../domain/services/cost-center-manager.service';

@Injectable()
export class TransferCostCenterManagementUseCase {
  constructor(
    private readonly costCenterRepository: ICostCenterRepository,
    private readonly costCenterMemberRepository: ICostCenterMemberRepository,
    private readonly costCenterManagerService: CostCenterManagerService,
    private readonly findMemberByIdUseCase: FindMemberByIdUseCase,
    private readonly transactionManager: ITransactionManager,
  ) {}

  async execute(
    companyId: string,
    fromMemberId: string,
    toMemberId: string,
  ): Promise<CostCenterEntity[]> {
    if (fromMemberId === toMemberId) {
      throw new ValidationError(
        'O destino da transferência não pode ser o gestor atual',
      );
    }

    await this.findMemberByIdUseCase.execute(fromMemberId, companyId);
    await this.costCenterManagerService.assertEligible(toMemberId, companyId);

    return this.transactionManager.run(async (context) => {
      const managed = await this.costCenterRepository.listManagedBy(
        fromMemberId,
        context,
      );

      const owned = managed.filter(
        (costCenter) => costCenter.companyId === companyId,
      );

      if (owned.length === 0) {
        throw new ValidationError(
          'Este membro não é gestor de nenhum Centro de Custo ativo',
        );
      }

      await this.costCenterRepository.reassignManager(
        fromMemberId,
        toMemberId,
        context,
      );

      for (const costCenter of owned) {
        await this.costCenterMemberRepository.linkIfAbsent(
          costCenter.id,
          toMemberId,
          context,
        );
      }

      return this.costCenterRepository.listManagedBy(toMemberId, context);
    });
  }
}
