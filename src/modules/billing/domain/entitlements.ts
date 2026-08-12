import { SubscriptionWithPlan } from './plan.entity';

export const PlanFeature = {
  AI_EXTRACTION: 'ai-extraction',
  EMAIL_APPROVAL: 'email-approval',
  ADVANCED_REPORTS: 'advanced-reports',
} as const;

export type PlanFeature = (typeof PlanFeature)[keyof typeof PlanFeature];

export interface Entitlements {
  features: readonly string[];
  maxMembers: number | null;
  maxRequestsMonth: number | null;
  maxStorageBytes: bigint | null;
  hasActiveSubscription: boolean;
}

export const NO_SUBSCRIPTION: Entitlements = {
  features: [],
  maxMembers: null,
  maxRequestsMonth: null,
  maxStorageBytes: null,
  hasActiveSubscription: false,
};

export function resolveEntitlements(
  current: SubscriptionWithPlan,
  now: Date = new Date(),
): Entitlements {
  const { subscription, plan } = current;
  const overrides = subscription.featureOverrides;

  const overrideApplies =
    overrides !== null &&
    (overrides.expiresAt === null || overrides.expiresAt > now);

  return {
    features: overrideApplies ? overrides.features : plan.features,
    maxMembers: plan.maxMembers,
    maxRequestsMonth: plan.maxRequestsMonth,
    maxStorageBytes: plan.maxStorageBytes,
    hasActiveSubscription: true,
  };
}
