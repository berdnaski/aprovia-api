import { Injectable } from '@nestjs/common';
import { isUniqueViolation } from 'src/shared/domain/prisma-error';
import { ITransactionManager } from 'src/shared/domain/transaction.manager';
import { CostCenterEntity } from '../domain/cost-center.entity';
import {
  CostCenterNameTakenError,
  InactiveParentCostCenterError,
  SelfParentCostCenterError,
} from '../domain/cost-centers.errors';
import { ICostCenterMemberRepository } from '../domain/cost-center-members.repository.interface';
import { ICostCenterRepository } from '../domain/cost-centers.repository.interface';
import { CostCenterHierarchyService } from '../domain/services/cost-center-hierarchy.service';
import { CostCenterManagerService } from '../domain/services/cost-center-manager.service';
import { UpdateCostCenterDto } from '../dto/update-cost-center.dto';
import { FindCostCenterByIdUseCase } from './find-cost-center-by-id.use-case';

@Injectable()
export class UpdateCostCenterUseCase {
  constructor(
    private readonly costCenterRepository: ICostCenterRepository,
    private readonly costCenterMemberRepository: ICostCenterMemberRepository,
    private readonly findCostCenterByIdUseCase: FindCostCenterByIdUseCase,
    private readonly costCenterManagerService: CostCenterManagerService,
    private readonly costCenterHierarchyService: CostCenterHierarchyService,
    private readonly transactionManager: ITransactionManager,
  ) {}

  async execute(
    id: string,
    companyId: string,
    data: UpdateCostCenterDto,
  ): Promise<CostCenterEntity> {
    await this.findCostCenterByIdUseCase.execute(id, companyId);

    if (data.managerId) {
      await this.costCenterManagerService.assertEligible(
        data.managerId,
        companyId,
      );
    }

    try {
      return await this.transactionManager.run(async (context) => {
        if (data.parentId) {
          if (data.parentId === id) {
            throw new SelfParentCostCenterError();
          }

          const parent = await this.findCostCenterByIdUseCase.execute(
            data.parentId,
            companyId,
            context,
          );

          if (parent.disabledAt) {
            throw new InactiveParentCostCenterError();
          }

          await this.costCenterHierarchyService.assertNoCycle(
            id,
            data.parentId,
            context,
          );
        }

        const updated = await this.costCenterRepository.update(
          id,
          {
            name: data.name,
            code: data.code,
            managerId: data.managerId,
            parentId: data.parentId,
          },
          context,
        );

        if (data.managerId) {
          await this.costCenterMemberRepository.linkIfAbsent(
            id,
            data.managerId,
            context,
          );
        }

        return updated;
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new CostCenterNameTakenError();
      }
      throw error;
    }
  }
}
