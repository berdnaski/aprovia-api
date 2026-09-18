import {
  AllocationLineDuplicatedError,
  AllocationSharesError,
  PrimaryCostCenterMissingError,
} from '../purchase-requests.errors';

export const FULL_SHARE_BPS = 10000;

export interface AllocationShare {
  costCenterId: string;
  chartAccountId: string | null;
  shareBps: number;
}

export interface AllocatedAmount extends AllocationShare {
  amountCents: bigint;
}

export function splitAmount(totalCents: bigint, shares: number[]): bigint[] {
  const full = BigInt(FULL_SHARE_BPS);
  const exact = shares.map((share) => totalCents * BigInt(share));
  const amounts = exact.map((value) => value / full);
  let remainder =
    totalCents - amounts.reduce((sum, amount) => sum + amount, 0n);

  const byFraction = exact
    .map((value, index) => ({ index, fraction: value % full }))
    .sort((left, right) =>
      left.fraction === right.fraction
        ? left.index - right.index
        : right.fraction > left.fraction
          ? 1
          : -1,
    );

  for (const { index } of byFraction) {
    if (remainder <= 0n) {
      break;
    }

    amounts[index] += 1n;
    remainder -= 1n;
  }

  return amounts;
}

export function allocate<T extends AllocationShare>(
  totalCents: bigint,
  lines: T[],
): (T & { amountCents: bigint })[] {
  const amounts = splitAmount(
    totalCents,
    lines.map((line) => line.shareBps),
  );

  return lines.map((line, index) => ({ ...line, amountCents: amounts[index] }));
}

export function assertValidAllocation(
  lines: AllocationShare[],
  primaryCostCenterId: string,
): void {
  const total = lines.reduce((sum, line) => sum + line.shareBps, 0);

  if (
    lines.length === 0 ||
    total !== FULL_SHARE_BPS ||
    lines.some((line) => line.shareBps <= 0)
  ) {
    throw new AllocationSharesError(total);
  }

  const keys = new Set(
    lines.map((line) => `${line.costCenterId}:${line.chartAccountId ?? ''}`),
  );

  if (keys.size !== lines.length) {
    throw new AllocationLineDuplicatedError();
  }

  if (!lines.some((line) => line.costCenterId === primaryCostCenterId)) {
    throw new PrimaryCostCenterMissingError();
  }
}

export function sameSplit(
  current: AllocationShare[],
  next: AllocationShare[],
): boolean {
  return (
    current.length === next.length &&
    current.every(
      (line, index) =>
        line.costCenterId === next[index].costCenterId &&
        line.shareBps === next[index].shareBps,
    )
  );
}

export function sumByCostCenter(lines: AllocatedAmount[]): Map<string, bigint> {
  const totals = new Map<string, bigint>();

  for (const line of lines) {
    totals.set(
      line.costCenterId,
      (totals.get(line.costCenterId) ?? 0n) + line.amountCents,
    );
  }

  return totals;
}
