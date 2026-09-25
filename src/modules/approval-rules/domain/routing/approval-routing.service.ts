import { CompanyMemberRole } from 'generated/prisma/enums';
import {
  NoEligibleApproverError,
  NoMatchingRuleError,
  NoSecondApproverError,
} from './routing.errors';
import {
  RoutingInput,
  RoutingMember,
  RoutingResult,
  RoutingRule,
  RoutingStep,
} from './routing.types';

interface Assignment {
  approverId: string;
  onBehalfOfId: string | null;
}

export class ApprovalRoutingService {
  route(input: RoutingInput): RoutingResult {
    const rule = this.selectRule(input);
    const candidates = this.candidates(input);
    const first = this.pick(candidates, input);

    if (!first) {
      throw new NoEligibleApproverError(input.amountCents);
    }

    const steps: Assignment[] = [this.assign(first, input)];

    if (this.requiresDual(rule, input)) {
      const second = this.pick(
        candidates.filter((member) => member.id !== first.id),
        input,
        { preferUnlimited: true },
      );

      if (!second) {
        throw new NoSecondApproverError(input.amountCents);
      }

      steps.push(this.assign(second, input));
    }

    return {
      ruleId: rule.id,
      steps: steps.map((assignment, index): RoutingStep => ({
        stepOrder: index + 1,
        expectedApproverId: assignment.approverId,
        onBehalfOfId: assignment.onBehalfOfId,
        requiresDualApproval: false,
      })),
    };
  }

  selectRule(input: RoutingInput): RoutingRule {
    const covers = (rule: RoutingRule) =>
      rule.isActive &&
      input.amountCents >= rule.minAmountCents &&
      (rule.maxAmountCents === null ||
        input.amountCents <= rule.maxAmountCents);

    const tiers: ((rule: RoutingRule) => boolean)[] = [
      (rule) =>
        rule.costCenterId === input.costCenter.id &&
        rule.categoryId === input.categoryId,
      (rule) =>
        rule.costCenterId === input.costCenter.id && rule.categoryId === null,
      (rule) =>
        rule.costCenterId === null && rule.categoryId === input.categoryId,
      (rule) => rule.costCenterId === null && rule.categoryId === null,
    ];

    for (const matchesTier of tiers) {
      const match = input.rules.filter(matchesTier).find(covers);

      if (match) {
        return match;
      }
    }

    throw new NoMatchingRuleError(input.amountCents);
  }

  private requiresDual(rule: RoutingRule, input: RoutingInput): boolean {
    if (rule.requiresDualApproval) {
      return true;
    }

    return (
      input.dualApprovalThresholdCents !== null &&
      input.amountCents >= input.dualApprovalThresholdCents
    );
  }

  private candidates(input: RoutingInput): RoutingMember[] {
    return input.members.filter(
      (member) =>
        !member.disabled &&
        member.id !== input.requester.id &&
        (member.role === CompanyMemberRole.APPROVER ||
          member.role === CompanyMemberRole.FINANCE_ADMIN),
    );
  }

  private unlimited(member: RoutingMember): boolean {
    return member.role === CompanyMemberRole.FINANCE_ADMIN;
  }

  private covers(member: RoutingMember, amountCents: bigint): boolean {
    return this.unlimited(member) || member.approvalLimitCents >= amountCents;
  }

  private pick(
    candidates: RoutingMember[],
    input: RoutingInput,
    options: { preferUnlimited?: boolean } = {},
  ): RoutingMember | null {
    const able = candidates.filter((member) =>
      this.covers(member, input.amountCents),
    );

    if (able.length === 0) {
      return null;
    }

    const rank = (member: RoutingMember): number[] => [
      options.preferUnlimited
        ? this.unlimited(member)
          ? 0
          : 1
        : this.unlimited(member)
          ? 1
          : 0,
      member.costCenterId === input.costCenter.id ? 0 : 1,
      this.unlimited(member) ? 0 : Number(member.approvalLimitCents),
    ];

    return [...able].sort((left, right) => {
      const a = rank(left);
      const b = rank(right);

      for (let index = 0; index < a.length; index += 1) {
        if (a[index] !== b[index]) {
          return a[index] - b[index];
        }
      }

      return left.id.localeCompare(right.id);
    })[0];
  }

  private assign(approver: RoutingMember, input: RoutingInput): Assignment {
    if (!this.isAbsent(approver, input.at) || !approver.substituteId) {
      return { approverId: approver.id, onBehalfOfId: null };
    }

    if (approver.substituteId === input.requester.id) {
      return { approverId: approver.id, onBehalfOfId: null };
    }

    return {
      approverId: approver.substituteId,
      onBehalfOfId: approver.id,
    };
  }

  private isAbsent(member: RoutingMember, at: Date): boolean {
    if (!member.absentFrom || !member.absentUntil) {
      return false;
    }

    return at >= member.absentFrom && at <= member.absentUntil;
  }
}
