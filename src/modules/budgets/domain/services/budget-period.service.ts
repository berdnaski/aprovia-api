import { Injectable } from '@nestjs/common';
import { InvalidBudgetPeriodError } from '../budgets.errors';

export const BudgetPeriodType = {
  MONTHLY: 'MONTHLY',
  QUARTERLY: 'QUARTERLY',
  ANNUAL: 'ANNUAL',
} as const;

export type BudgetPeriodType =
  (typeof BudgetPeriodType)[keyof typeof BudgetPeriodType];

export interface BudgetPeriod {
  periodStart: Date;
  periodEnd: Date;
}

const MONTH_KEY = /^(\d{4})-(0[1-9]|1[0-2])$/;

const MONTHS_IN_PERIOD: Record<BudgetPeriodType, number> = {
  MONTHLY: 1,
  QUARTERLY: 3,
  ANNUAL: 12,
};

@Injectable()
export class BudgetPeriodService {
  fromMonthKey(
    monthKey: string,
    type: BudgetPeriodType = BudgetPeriodType.MONTHLY,
  ): BudgetPeriod {
    const match = MONTH_KEY.exec(monthKey);

    if (!match) {
      throw new InvalidBudgetPeriodError();
    }

    const year = Number(match[1]);
    const monthIndex = Number(match[2]) - 1;
    const span = MONTHS_IN_PERIOD[type];

    if (type !== BudgetPeriodType.MONTHLY && monthIndex % span !== 0) {
      throw new InvalidBudgetPeriodError();
    }

    return {
      periodStart: new Date(Date.UTC(year, monthIndex, 1)),
      periodEnd: new Date(Date.UTC(year, monthIndex + span, 0)),
    };
  }

  currentMonthKey(reference: Date = new Date()): string {
    const year = reference.getUTCFullYear();
    const month = `${reference.getUTCMonth() + 1}`.padStart(2, '0');

    return `${year}-${month}`;
  }

  current(reference: Date = new Date()): BudgetPeriod {
    return this.fromMonthKey(this.currentMonthKey(reference));
  }

  nextMonthKey(monthKey: string): string {
    const { periodEnd } = this.fromMonthKey(monthKey);
    const next = new Date(
      Date.UTC(periodEnd.getUTCFullYear(), periodEnd.getUTCMonth() + 1, 1),
    );

    return this.currentMonthKey(next);
  }
}
