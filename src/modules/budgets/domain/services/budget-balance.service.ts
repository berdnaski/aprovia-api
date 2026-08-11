import { Injectable } from '@nestjs/common';
import { BudgetEntity } from '../budget.entity';

export interface BudgetBalance {
  budgetId: string;
  costCenterId: string;
  periodStart: Date;
  periodEnd: Date;
  totalAmountCents: bigint;
  committedCents: bigint;
  underReviewCents: bigint;
  availableCents: bigint;
  usagePercent: number;
}

export const BudgetVerdict = {
  FITS: 'FITS',
  WITHIN_TOLERANCE: 'WITHIN_TOLERANCE',
  REQUIRES_OVERRIDE: 'REQUIRES_OVERRIDE',
} as const;

export type BudgetVerdict = (typeof BudgetVerdict)[keyof typeof BudgetVerdict];

export interface BudgetAssessment {
  balance: BudgetBalance;
  amountCents: bigint;
  overrunCents: bigint;
  toleranceCents: bigint;
  verdict: BudgetVerdict;
}

@Injectable()
export class BudgetBalanceService {
  build(
    budget: BudgetEntity,
    committedCents: bigint,
    underReviewCents = 0n,
  ): BudgetBalance {
    const availableCents = budget.totalAmountCents - committedCents;

    return {
      budgetId: budget.id,
      costCenterId: budget.costCenterId,
      periodStart: budget.periodStart,
      periodEnd: budget.periodEnd,
      totalAmountCents: budget.totalAmountCents,
      committedCents,
      underReviewCents,
      availableCents,
      usagePercent: this.usagePercent(budget.totalAmountCents, committedCents),
    };
  }

  assess(
    balance: BudgetBalance,
    amountCents: bigint,
    overrunTolerancePercent: number,
  ): BudgetAssessment {
    const toleranceCents = this.percentOf(
      balance.totalAmountCents,
      overrunTolerancePercent,
    );

    if (amountCents <= balance.availableCents) {
      return {
        balance,
        amountCents,
        overrunCents: 0n,
        toleranceCents,
        verdict: BudgetVerdict.FITS,
      };
    }

    const overrunCents = amountCents - balance.availableCents;

    return {
      balance,
      amountCents,
      overrunCents,
      toleranceCents,
      verdict:
        overrunCents <= toleranceCents
          ? BudgetVerdict.WITHIN_TOLERANCE
          : BudgetVerdict.REQUIRES_OVERRIDE,
    };
  }

  private percentOf(totalCents: bigint, percent: number): bigint {
    const basisPoints = BigInt(Math.round(percent * 100));

    return (totalCents * basisPoints) / 10000n;
  }

  private usagePercent(totalCents: bigint, committedCents: bigint): number {
    if (totalCents <= 0n) {
      return committedCents > 0n ? 100 : 0;
    }

    return Number((committedCents * 10000n) / totalCents) / 100;
  }
}
