import { ChartAccountKind } from 'generated/prisma/enums';
import { ChartAccountEntity } from '../chart-account.entity';
import {
  GroupAccountCannotPostError,
  InactiveAccountError,
  NonPurchaseAccountError,
  ParentAccountMismatchError,
  ParentKindMismatchError,
  PostableParentError,
} from '../chart-accounts.errors';

export const PURCHASE_ACCOUNT_KINDS: ReadonlySet<ChartAccountKind> = new Set([
  ChartAccountKind.EXPENSE,
  ChartAccountKind.COST,
  ChartAccountKind.ASSET,
]);

export function assertFitsUnderParent(
  code: string,
  kind: ChartAccountKind,
  parent: Pick<ChartAccountEntity, 'code' | 'kind' | 'postable'>,
): void {
  if (!code.startsWith(`${parent.code}.`)) {
    throw new ParentAccountMismatchError(code, parent.code);
  }

  if (parent.postable) {
    throw new PostableParentError(parent.code);
  }

  if (parent.kind !== kind) {
    throw new ParentKindMismatchError(code);
  }
}

export function assertAcceptsPurchases(
  account: Pick<ChartAccountEntity, 'code' | 'kind' | 'postable' | 'active'>,
): void {
  if (!account.active) {
    throw new InactiveAccountError(account.code);
  }

  if (!account.postable) {
    throw new GroupAccountCannotPostError(account.code);
  }

  if (!PURCHASE_ACCOUNT_KINDS.has(account.kind)) {
    throw new NonPurchaseAccountError(account.code);
  }
}
