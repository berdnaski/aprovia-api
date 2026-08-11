import { Injectable } from '@nestjs/common';
import { CostCenterEntity } from '../domain/cost-center.entity';
import {
  ICostCenterRepository,
  ListCostCentersFilter,
} from '../domain/cost-centers.repository.interface';

@Injectable()
export class ListCostCentersUseCase {
  constructor(private readonly costCenterRepository: ICostCenterRepository) {}

  execute(
    companyId: string,
    filter?: ListCostCentersFilter,
  ): Promise<CostCenterEntity[]> {
    return this.costCenterRepository.list(companyId, filter);
  }
}
