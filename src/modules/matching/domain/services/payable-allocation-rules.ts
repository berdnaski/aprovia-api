import { AllocationShare } from 'src/modules/purchase-requests/domain/services/allocation-split';
import {
  PayableAllocationLineDuplicatedError,
  PayableAllocationSharesError,
} from '../matching.errors';

const FULL_SHARE_BPS = 10000;

export function assertValidPayableAllocation(lines: AllocationShare[]): void {
  const total = lines.reduce((sum, line) => sum + line.shareBps, 0);

  if (
    lines.length === 0 ||
    total !== FULL_SHARE_BPS ||
    lines.some((line) => line.shareBps <= 0)
  ) {
    throw new PayableAllocationSharesError(total);
  }

  const keys = new Set(
    lines.map((line) => `${line.costCenterId}:${line.chartAccountId ?? ''}`),
  );

  if (keys.size !== lines.length) {
    throw new PayableAllocationLineDuplicatedError();
  }
}
