import { Injectable } from '@nestjs/common';
import { PlanTier } from 'generated/prisma/enums';
import { PlanEntity } from 'src/modules/billing/domain/plan.entity';
import {
  IPlanRepository,
  WritePlanData,
} from 'src/modules/billing/domain/plans.repository.interface';
import {
  ConflictError,
  NotFoundError,
} from 'src/shared/domain/errors/domain.error';

export interface PlanWithUsage extends PlanEntity {
  subscriptions: number;
}

@Injectable()
export class ManagePlansUseCase {
  constructor(private readonly planRepository: IPlanRepository) {}

  async list(): Promise<PlanWithUsage[]> {
    const plans = await this.planRepository.listAll();

    return Promise.all(
      plans.map(async (plan) => ({
        ...plan,
        subscriptions: await this.planRepository.countSubscriptions(plan.id),
      })),
    );
  }

  async create(data: WritePlanData): Promise<PlanEntity> {
    const taken = await this.planRepository.findByTier(data.tier);

    if (taken) {
      throw new ConflictError(
        `A faixa ${data.tier} já é usada pelo plano "${taken.name}". Cada faixa comporta um plano só — edite o existente ou escolha outra faixa.`,
      );
    }

    return this.planRepository.create(data);
  }

  async update(
    id: string,
    data: Partial<WritePlanData>,
  ): Promise<PlanEntity> {
    const plan = await this.planRepository.findById(id);

    if (!plan) {
      throw new NotFoundError('Plano');
    }

    if (data.active === false) {
      const inUse = await this.planRepository.countSubscriptions(id);

      if (inUse > 0) {
        throw new ConflictError(
          `Este plano tem ${inUse} ${inUse === 1 ? 'assinatura' : 'assinaturas'}. Mova essas organizações para outro plano antes de desativá-lo.`,
        );
      }
    }

    return this.planRepository.update(id, data);
  }
}
