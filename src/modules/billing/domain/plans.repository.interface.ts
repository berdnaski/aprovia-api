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

export interface WritePlanData {
  name: string;
  tier: PlanTier;
  priceCents: bigint;
  maxMembers: number | null;
  maxRequestsMonth: number | null;
  maxStorageBytes: bigint | null;
  features: string[];
  active: boolean;
}

export abstract class IPlanRepository {
  abstract listActive(): Promise<PlanEntity[]>;
  abstract listAll(): Promise<PlanEntity[]>;
  abstract findById(id: string): Promise<PlanEntity | null>;
  abstract findByTier(tier: PlanTier): Promise<PlanEntity | null>;
  abstract create(data: WritePlanData): Promise<PlanEntity>;
  abstract update(
    id: string,
    data: Partial<WritePlanData>,
  ): Promise<PlanEntity>;
  abstract countSubscriptions(planId: string): Promise<number>;
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
