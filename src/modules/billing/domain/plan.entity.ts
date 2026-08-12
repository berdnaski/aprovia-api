import { PlanTier, SubscriptionStatus } from 'generated/prisma/enums';

export interface PlanEntity {
  id: string;
  name: string;
  tier: PlanTier;
  priceCents: bigint;
  maxMembers: number | null;
  maxRequestsMonth: number | null;
  maxStorageBytes: bigint | null;
  features: readonly string[];
  active: boolean;
}

export interface SubscriptionEntity {
  id: string;
  companyId: string;
  planId: string;
  status: SubscriptionStatus;
  periodStart: Date;
  periodEnd: Date | null;
  contractedPriceCents: bigint | null;
  featureOverrides: FeatureOverrides | null;
  canceledAt: Date | null;
}

export interface FeatureOverrides {
  features: readonly string[];
  expiresAt: Date | null;
}

export interface SubscriptionWithPlan {
  subscription: SubscriptionEntity;
  plan: PlanEntity;
}

export const ACTIVE_SUBSCRIPTION_STATUSES: SubscriptionStatus[] = [
  SubscriptionStatus.ACTIVE,
  SubscriptionStatus.TRIALING,
];
