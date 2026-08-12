import { Injectable } from '@nestjs/common';
import { PlanEntity } from '../domain/plan.entity';
import { IPlanRepository } from '../domain/plans.repository.interface';

@Injectable()
export class ListPlansUseCase {
  constructor(private readonly planRepository: IPlanRepository) {}

  execute(): Promise<PlanEntity[]> {
    return this.planRepository.listActive();
  }
}
