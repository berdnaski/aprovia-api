import { TransactionContext } from 'src/shared/domain/transaction.manager';

export const ResponsibilityBlockerKind = {
  COST_CENTER_MANAGER: 'COST_CENTER_MANAGER',
  PENDING_APPROVAL: 'PENDING_APPROVAL',
} as const;

export type ResponsibilityBlockerKind =
  (typeof ResponsibilityBlockerKind)[keyof typeof ResponsibilityBlockerKind];

export const MemberAction = {
  DEACTIVATE: 'DEACTIVATE',
  DEMOTE: 'DEMOTE',
} as const;

export type MemberAction = (typeof MemberAction)[keyof typeof MemberAction];

export type BlockerDetailValue = string | number | boolean | null;

export interface ResponsibilityBlockerItem {
  id: string;
  label: string;
  details?: Readonly<Record<string, BlockerDetailValue>>;
}

export interface ResponsibilityBlocker {
  kind: ResponsibilityBlockerKind;
  message: string;
  items: ResponsibilityBlockerItem[];
}

export abstract class IMemberResponsibilityGuard {
  abstract readonly blocks: readonly MemberAction[];

  abstract check(
    memberId: string,
    companyId: string,
    context?: TransactionContext,
  ): Promise<ResponsibilityBlocker | null>;
}
