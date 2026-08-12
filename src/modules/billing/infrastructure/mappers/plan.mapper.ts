import { PlanModel as PrismaPlan } from 'generated/prisma/models';
import { PlanEntity } from '../../domain/plan.entity';

export function asStringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === 'string');
}

export class PlanMapper {
  static toDomain(this: void, raw: PrismaPlan): PlanEntity {
    return {
      id: raw.id,
      name: raw.name,
      tier: raw.tier,
      priceCents: raw.price_cents,
      maxMembers: raw.max_members,
      maxRequestsMonth: raw.max_requests_month,
      maxStorageBytes: raw.max_storage_bytes,
      features: asStringList(raw.features),
      active: raw.active,
    };
  }
}
