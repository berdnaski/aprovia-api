import { PlanTier, SubscriptionStatus } from 'generated/prisma/enums';
import { TransactionContext } from 'src/shared/domain/transaction.manager';
import {
  FeatureOverrides,
  PlanEntity,
  SubscriptionEntity,
  SubscriptionWithPlan,
} from './plan.entity';

export interface CreateSubscriptionData {
  companyId: string;
  planId: string;
  status: SubscriptionStatus;
  periodStart: Date;
  periodEnd: Date | null;
  contractedPriceCents: bigint | null;
}

export abstract class IPlanRepository {
  abstract listActive(): Promise<PlanEntity[]>;
  abstract findById(id: string): Promise<PlanEntity | null>;
  abstract findByTier(tier: PlanTier): Promise<PlanEntity | null>;
}

export abstract class ISubscriptionRepository {
  abstract findActiveByCompany(
    companyId: string,
    context?: TransactionContext,
  ): Promise<SubscriptionWithPlan | null>;

  abstract listByCompany(companyId: string): Promise<SubscriptionWithPlan[]>;

  abstract lockActive(
    companyId: string,
    context: TransactionContext,
  ): Promise<void>;

  abstract create(
    data: CreateSubscriptionData,
    context?: TransactionContext,
  ): Promise<SubscriptionEntity>;

  abstract cancelActive(
    companyId: string,
    context?: TransactionContext,
  ): Promise<number>;

  abstract setFeatureOverrides(
    subscriptionId: string,
    overrides: FeatureOverrides | null,
  ): Promise<SubscriptionEntity>;
}
