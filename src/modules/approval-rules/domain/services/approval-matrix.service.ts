import { Injectable } from '@nestjs/common';
import { ApprovalRuleEntity } from '../approval-rule.entity';
import {
  ApprovalMatrixEmptyError,
  ApprovalMatrixGapError,
  ApprovalMatrixOpenRangeError,
  ApprovalMatrixOverlapError,
  ApprovalMatrixStartError,
  InvalidAmountRangeError,
  NoApprovalRuleError,
} from '../approval-rules.errors';
import { ApprovalRuleRangeData } from '../approval-rules.repository.interface';

@Injectable()
export class ApprovalMatrixService {
  assertCoherent(ranges: ApprovalRuleRangeData[]): ApprovalRuleRangeData[] {
    if (ranges.length === 0) {
      throw new ApprovalMatrixEmptyError();
    }

    for (const range of ranges) {
      if (
        range.maxAmountCents !== null &&
        range.maxAmountCents <= range.minAmountCents
      ) {
        throw new InvalidAmountRangeError(
          range.minAmountCents,
          range.maxAmountCents,
        );
      }
    }

    const sorted = [...ranges].sort((a, b) =>
      a.minAmountCents < b.minAmountCents
        ? -1
        : a.minAmountCents > b.minAmountCents
          ? 1
          : 0,
    );

    if (sorted[0].minAmountCents !== 0n) {
      throw new ApprovalMatrixStartError(sorted[0].minAmountCents);
    }

    const openEnded = sorted.filter((range) => range.maxAmountCents === null);

    if (
      openEnded.length !== 1 ||
      sorted[sorted.length - 1].maxAmountCents !== null
    ) {
      throw new ApprovalMatrixOpenRangeError();
    }

    for (let index = 1; index < sorted.length; index += 1) {
      const previous = sorted[index - 1];
      const current = sorted[index];
      const previousMax = previous.maxAmountCents;

      if (previousMax === null) {
        throw new ApprovalMatrixOpenRangeError();
      }

      const expectedMin = previousMax + 1n;

      if (current.minAmountCents > expectedMin) {
        throw new ApprovalMatrixGapError(previousMax, current.minAmountCents);
      }

      if (current.minAmountCents < expectedMin) {
        throw new ApprovalMatrixOverlapError(
          previousMax,
          current.minAmountCents,
        );
      }
    }

    return sorted;
  }

  resolve(
    rules: ApprovalRuleEntity[],
    amountCents: bigint,
    costCenterId: string | null,
    categoryId: string | null,
  ): ApprovalRuleEntity {
    const tiers: ((rule: ApprovalRuleEntity) => boolean)[] = [
      (rule) =>
        rule.costCenterId === costCenterId && rule.categoryId === categoryId,
      (rule) => rule.costCenterId === costCenterId && rule.categoryId === null,
      (rule) => rule.costCenterId === null && rule.categoryId === categoryId,
      (rule) => rule.costCenterId === null && rule.categoryId === null,
    ];

    const active = rules.filter((rule) => rule.isActive);

    for (const matchesTier of tiers) {
      const candidates = active.filter(matchesTier);

      if (candidates.length === 0) {
        continue;
      }

      const match = candidates.find((rule) => this.covers(rule, amountCents));

      if (match) {
        return match;
      }
    }

    throw new NoApprovalRuleError(amountCents);
  }

  private covers(rule: ApprovalRuleEntity, amountCents: bigint): boolean {
    if (amountCents < rule.minAmountCents) {
      return false;
    }

    return rule.maxAmountCents === null || amountCents <= rule.maxAmountCents;
  }
}
