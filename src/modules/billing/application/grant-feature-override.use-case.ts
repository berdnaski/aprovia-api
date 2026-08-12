import { Injectable } from '@nestjs/common';
import { ConflictError } from 'src/shared/domain/errors/domain.error';
import { SubscriptionEntity } from '../domain/plan.entity';
import { ISubscriptionRepository } from '../domain/plans.repository.interface';

export interface GrantFeatureOverrideInput {
  features: string[];
  expiresAt: Date | null;
}

@Injectable()
export class GrantFeatureOverrideUseCase {
  constructor(
    private readonly subscriptionRepository: ISubscriptionRepository,
  ) {}

  async execute(
    companyId: string,
    input: GrantFeatureOverrideInput,
  ): Promise<SubscriptionEntity> {
    const current =
      await this.subscriptionRepository.findActiveByCompany(companyId);

    if (!current) {
      throw new ConflictError(
        'A organização precisa de uma assinatura ativa para receber exceções de funcionalidade',
      );
    }

    return this.subscriptionRepository.setFeatureOverrides(
      current.subscription.id,
      input.features.length > 0
        ? { features: input.features, expiresAt: input.expiresAt }
        : null,
    );
  }
}
