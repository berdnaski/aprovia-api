import { Injectable } from '@nestjs/common';
import { TransactionContext } from 'src/shared/domain/transaction.manager';
import {
  FeatureNotInPlanError,
  MemberLimitReachedError,
  NoActiveSubscriptionError,
  RequestQuotaExceededError,
} from '../domain/billing.errors';
import {
  Entitlements,
  NO_SUBSCRIPTION,
  resolveEntitlements,
} from '../domain/entitlements';
import { ISubscriptionRepository } from '../domain/plans.repository.interface';
import {
  IRequestUsageRepository,
  ISeatUsageRepository,
} from '../domain/seat-usage.repository.interface';

@Injectable()
export class EntitlementsService {
  constructor(
    private readonly subscriptionRepository: ISubscriptionRepository,
    private readonly seatUsageRepository: ISeatUsageRepository,
    private readonly requestUsageRepository: IRequestUsageRepository,
  ) {}

  async forCompany(
    companyId: string,
    context?: TransactionContext,
  ): Promise<Entitlements> {
    const current = await this.subscriptionRepository.findActiveByCompany(
      companyId,
      context,
    );

    return current ? resolveEntitlements(current) : NO_SUBSCRIPTION;
  }

  async has(companyId: string, feature: string): Promise<boolean> {
    const entitlements = await this.forCompany(companyId);

    return entitlements.features.includes(feature);
  }

  async assertFeature(companyId: string, feature: string): Promise<void> {
    if (!(await this.has(companyId, feature))) {
      throw new FeatureNotInPlanError(feature);
    }
  }

  async assertOperational(companyId: string): Promise<void> {
    const entitlements = await this.forCompany(companyId);

    if (!entitlements.hasActiveSubscription) {
      throw new NoActiveSubscriptionError();
    }
  }

  async assertSeatAvailable(
    companyId: string,
    context: TransactionContext,
  ): Promise<void> {
    await this.subscriptionRepository.lockActive(companyId, context);

    const entitlements = await this.forCompany(companyId, context);

    if (!entitlements.hasActiveSubscription) {
      throw new NoActiveSubscriptionError();
    }

    if (entitlements.maxMembers === null) {
      return;
    }

    const used = await this.seatUsageRepository.countOccupiedSeats(
      companyId,
      context,
    );

    if (used >= entitlements.maxMembers) {
      throw new MemberLimitReachedError(used, entitlements.maxMembers);
    }
  }

  async requestUsage(
    companyId: string,
  ): Promise<{ used: number; max: number | null }> {
    const entitlements = await this.forCompany(companyId);

    return {
      used: await this.requestUsageRepository.countSubmittedThisMonth(
        companyId,
        new Date(),
      ),
      max: entitlements.maxRequestsMonth,
    };
  }

  async assertRequestQuota(
    companyId: string,
    context?: TransactionContext,
  ): Promise<void> {
    const entitlements = await this.forCompany(companyId, context);

    if (!entitlements.hasActiveSubscription) {
      throw new NoActiveSubscriptionError();
    }

    if (entitlements.maxRequestsMonth === null) {
      return;
    }

    const used = await this.requestUsageRepository.countSubmittedThisMonth(
      companyId,
      new Date(),
      context,
    );

    if (used >= entitlements.maxRequestsMonth) {
      throw new RequestQuotaExceededError(used, entitlements.maxRequestsMonth);
    }
  }
}
