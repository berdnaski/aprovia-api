import { Injectable } from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { PlanTier, SubscriptionStatus } from 'generated/prisma/enums';
import { TransactionContext } from 'src/shared/domain/transaction.manager';
import { prismaClient } from 'src/shared/infrastructure/database/prisma-transaction.manager';
import { PrismaService } from 'src/shared/infrastructure/database/prisma.service';
import {
  ACTIVE_SUBSCRIPTION_STATUSES,
  FeatureOverrides,
  PlanEntity,
  SubscriptionEntity,
  SubscriptionWithPlan,
} from '../domain/plan.entity';
import {
  CreateSubscriptionData,
  IPlanRepository,
  ISubscriptionRepository,
} from '../domain/plans.repository.interface';
import { PlanMapper } from './mappers/plan.mapper';
import { SubscriptionMapper } from './mappers/subscription.mapper';

function toOverridesJson(
  overrides: FeatureOverrides | null,
): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  if (!overrides) {
    return Prisma.JsonNull;
  }

  return {
    features: [...overrides.features],
    expiresAt: overrides.expiresAt?.toISOString() ?? null,
  };
}

@Injectable()
export class PlanRepository implements IPlanRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listActive(): Promise<PlanEntity[]> {
    const records = await this.prisma.plan.findMany({
      where: { active: true },
      orderBy: { price_cents: 'asc' },
    });

    return records.map(PlanMapper.toDomain);
  }

  async findById(id: string): Promise<PlanEntity | null> {
    const record = await this.prisma.plan.findUnique({ where: { id } });

    return record ? PlanMapper.toDomain(record) : null;
  }

  async findByTier(tier: PlanTier): Promise<PlanEntity | null> {
    const record = await this.prisma.plan.findUnique({ where: { tier } });

    return record ? PlanMapper.toDomain(record) : null;
  }
}

@Injectable()
export class SubscriptionRepository implements ISubscriptionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findActiveByCompany(
    companyId: string,
    context?: TransactionContext,
  ): Promise<SubscriptionWithPlan | null> {
    const record = await prismaClient(
      this.prisma,
      context,
    ).subscription.findFirst({
      where: {
        company_id: companyId,
        status: { in: ACTIVE_SUBSCRIPTION_STATUSES },
      },
      include: { plan: true },
      orderBy: { created_at: 'desc' },
    });

    if (!record) {
      return null;
    }

    return {
      subscription: SubscriptionMapper.toDomain(record),
      plan: PlanMapper.toDomain(record.plan),
    };
  }

  async listByCompany(companyId: string): Promise<SubscriptionWithPlan[]> {
    const records = await this.prisma.subscription.findMany({
      where: { company_id: companyId },
      include: { plan: true },
      orderBy: { created_at: 'desc' },
    });

    return records.map((record) => ({
      subscription: SubscriptionMapper.toDomain(record),
      plan: PlanMapper.toDomain(record.plan),
    }));
  }

  async lockActive(
    companyId: string,
    context: TransactionContext,
  ): Promise<void> {
    await prismaClient(this.prisma, context).$queryRaw`
      SELECT id FROM subscriptions
      WHERE company_id = ${companyId}
        AND status IN ('ACTIVE', 'TRIALING')
      FOR UPDATE
    `;
  }

  async create(
    data: CreateSubscriptionData,
    context?: TransactionContext,
  ): Promise<SubscriptionEntity> {
    const record = await prismaClient(this.prisma, context).subscription.create(
      {
        data: {
          company_id: data.companyId,
          plan_id: data.planId,
          status: data.status,
          period_start: data.periodStart,
          period_end: data.periodEnd,
          contracted_price_cents: data.contractedPriceCents,
        },
      },
    );

    return SubscriptionMapper.toDomain(record);
  }

  async cancelActive(
    companyId: string,
    context?: TransactionContext,
  ): Promise<number> {
    const { count } = await prismaClient(
      this.prisma,
      context,
    ).subscription.updateMany({
      where: {
        company_id: companyId,
        status: { in: ACTIVE_SUBSCRIPTION_STATUSES },
      },
      data: { status: SubscriptionStatus.CANCELED, canceled_at: new Date() },
    });

    return count;
  }

  async setFeatureOverrides(
    subscriptionId: string,
    overrides: FeatureOverrides | null,
  ): Promise<SubscriptionEntity> {
    const record = await this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: { feature_overrides: toOverridesJson(overrides) },
    });

    return SubscriptionMapper.toDomain(record);
  }
}
