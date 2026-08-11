import { Injectable } from '@nestjs/common';
import { TransactionContext } from 'src/shared/domain/transaction.manager';
import { CostCenterCycleError } from '../cost-centers.errors';
import { ICostCenterRepository } from '../cost-centers.repository.interface';

@Injectable()
export class CostCenterHierarchyService {
  constructor(private readonly costCenterRepository: ICostCenterRepository) {}

  async assertNoCycle(
    costCenterId: string,
    parentId: string,
    context?: TransactionContext,
  ): Promise<void> {
    const visited = new Set<string>([costCenterId]);
    let currentId: string | null = parentId;

    while (currentId) {
      if (visited.has(currentId)) {
        throw new CostCenterCycleError();
      }

      visited.add(currentId);

      const current = await this.costCenterRepository.findById(
        currentId,
        context,
      );

      currentId = current?.parentId ?? null;
    }
  }
}
