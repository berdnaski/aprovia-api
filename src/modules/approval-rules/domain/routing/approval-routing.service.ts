import { ApproverType } from 'generated/prisma/enums';
import {
  NoEligibleApproverError,
  NoMatchingRuleError,
  RoutingCycleError,
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
    const requiresDualApproval = this.requiresDual(rule, input);
    const chain = this.buildChain(input);

    return {
      ruleId: rule.id,
      steps: chain.map((assignment, index): RoutingStep => ({
        stepOrder: index + 1,
        expectedApproverId: assignment.approverId,
        onBehalfOfId: assignment.onBehalfOfId,
        requiresDualApproval,
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

  private buildChain(input: RoutingInput): Assignment[] {
    const rule = this.selectRule(input);
    const members = new Map<string, RoutingMember>(
      [...input.hierarchy, ...input.financeAdmins, input.requester].map(
        (member) => [member.id, member],
      ),
    );

    const startId =
      rule.approverType === ApproverType.COST_CENTER_MANAGER
        ? input.costCenter.managerId
        : input.requester.managerId;

    const steps: Assignment[] = [];
    const visited = new Set<string>();
    let currentId: string | null = startId;

    while (currentId) {
      if (visited.has(currentId)) {
        throw new RoutingCycleError(currentId);
      }

      visited.add(currentId);

      const current: RoutingMember | undefined = members.get(currentId);

      if (!current) {
        break;
      }

      if (currentId === input.requester.id) {
        currentId = current.managerId;
        continue;
      }

      steps.push(this.assign(current, input));

      if (current.approvalLimitCents >= input.amountCents) {
        return steps;
      }

      currentId = current.managerId;
    }

    return [...steps, this.fallbackToFinance(input, visited)];
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

  private fallbackToFinance(
    input: RoutingInput,
    visited: Set<string>,
  ): Assignment {
    const eligible = input.financeAdmins.find(
      (admin) => admin.id !== input.requester.id && !visited.has(admin.id),
    );

    if (!eligible) {
      throw new NoEligibleApproverError(input.amountCents);
    }

    return this.assign(eligible, input);
  }
}
