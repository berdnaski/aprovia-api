import { Injectable } from '@nestjs/common';
import { isUniqueViolation } from 'src/shared/domain/prisma-error';
import { ITransactionManager } from 'src/shared/domain/transaction.manager';
import { CostCenterEntity } from '../domain/cost-center.entity';
import { ICostCenterMemberRepository } from '../domain/cost-center-members.repository.interface';
import {
  CostCenterNameTakenError,
  InactiveParentCostCenterError,
} from '../domain/cost-centers.errors';
import { ICostCenterRepository } from '../domain/cost-centers.repository.interface';
import { CostCenterManagerService } from '../domain/services/cost-center-manager.service';
import { CreateCostCenterDto } from '../dto/create-cost-center.dto';
import { FindCostCenterByIdUseCase } from './find-cost-center-by-id.use-case';

@Injectable()
export class CreateCostCenterUseCase {
  constructor(
    private readonly costCenterRepository: ICostCenterRepository,
    private readonly costCenterMemberRepository: ICostCenterMemberRepository,
    private readonly costCenterManagerService: CostCenterManagerService,
    private readonly findCostCenterByIdUseCase: FindCostCenterByIdUseCase,
    private readonly transactionManager: ITransactionManager,
  ) {}

  async execute(
    companyId: string,
    data: CreateCostCenterDto,
  ): Promise<CostCenterEntity> {
    await this.costCenterManagerService.assertEligible(
      data.managerId,
      companyId,
    );

    if (data.parentId) {
      const parent = await this.findCostCenterByIdUseCase.execute(
        data.parentId,
        companyId,
      );

      if (parent.disabledAt) {
        throw new InactiveParentCostCenterError();
      }
    }

    try {
      return await this.transactionManager.run(async (context) => {
        const costCenter = await this.costCenterRepository.create(
          {
            companyId,
            name: data.name,
            code: data.code ?? null,
            managerId: data.managerId,
            parentId: data.parentId ?? null,
          },
          context,
        );

        await this.costCenterMemberRepository.link(
          costCenter.id,
          data.managerId,
          context,
        );

        return costCenter;
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new CostCenterNameTakenError();
      }
      throw error;
    }
  }
}
