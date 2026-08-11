import { Injectable } from '@nestjs/common';
import {
  ForbiddenError,
  NotFoundError,
} from 'src/shared/domain/errors/domain.error';
import { TransactionContext } from 'src/shared/domain/transaction.manager';
import { CostCenterEntity } from '../domain/cost-center.entity';
import { ICostCenterRepository } from '../domain/cost-centers.repository.interface';

@Injectable()
export class FindCostCenterByIdUseCase {
  constructor(private readonly costCenterRepository: ICostCenterRepository) {}

  async execute(
    id: string,
    companyId: string,
    context?: TransactionContext,
  ): Promise<CostCenterEntity> {
    const costCenter = await this.costCenterRepository.findById(id, context);

    if (!costCenter) {
      throw new NotFoundError('Centro de Custo', id);
    }

    if (costCenter.companyId !== companyId) {
      throw new ForbiddenError('Este Centro de Custo pertence a outra empresa');
    }

    return costCenter;
  }
}
