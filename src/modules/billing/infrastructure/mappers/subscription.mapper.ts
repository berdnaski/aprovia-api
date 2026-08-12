import { SubscriptionModel as PrismaSubscription } from 'generated/prisma/models';
import { FeatureOverrides, SubscriptionEntity } from '../../domain/plan.entity';
import { asStringList } from './plan.mapper';

export function toFeatureOverrides(value: unknown): FeatureOverrides | null {
  if (Array.isArray(value)) {
    const features = asStringList(value);
    return features.length > 0 ? { features, expiresAt: null } : null;
  }

  if (!value || typeof value !== 'object') {
    return null;
  }

  const raw = value as { features?: unknown; expiresAt?: unknown };
  const features = asStringList(raw.features);

  if (features.length === 0) {
    return null;
  }

  return {
    features,
    expiresAt:
      typeof raw.expiresAt === 'string' ? new Date(raw.expiresAt) : null,
  };
}

export class SubscriptionMapper {
  static toDomain(this: void, raw: PrismaSubscription): SubscriptionEntity {
    return {
      id: raw.id,
      companyId: raw.company_id,
      planId: raw.plan_id,
      status: raw.status,
      periodStart: raw.period_start,
      periodEnd: raw.period_end,
      contractedPriceCents: raw.contracted_price_cents,
      featureOverrides: toFeatureOverrides(raw.feature_overrides),
      canceledAt: raw.canceled_at,
    };
  }
}
