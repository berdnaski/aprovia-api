import { ReceiptStatus } from 'generated/prisma/enums';

export interface OrderItemSnapshot {
  id: string;
  description: string;
  orderedQuantity: string;
  receivedQuantity: string;
}

export interface ReceiptLine {
  purchaseOrderItemId: string;
  quantity: string;
  rejectedQuantity: string;
}

export interface BalanceViolation {
  description: string;
  pending: string;
  informed: string;
}

export function pendingFor(item: OrderItemSnapshot): number {
  return Number(item.orderedQuantity) - Number(item.receivedQuantity);
}

export function findBalanceViolation(
  items: OrderItemSnapshot[],
  lines: ReceiptLine[],
): BalanceViolation | null {
  for (const line of lines) {
    const item = items.find(
      (candidate) => candidate.id === line.purchaseOrderItemId,
    );

    if (!item) {
      continue;
    }

    const pending = pendingFor(item);
    const informed = Number(line.quantity);

    if (informed > pending) {
      return {
        description: item.description,
        pending: pending.toFixed(3),
        informed: informed.toFixed(3),
      };
    }
  }

  return null;
}

export function resolveReceiptStatus(
  items: OrderItemSnapshot[],
  lines: ReceiptLine[],
): ReceiptStatus {
  const allRejected = lines.every(
    (line) => Number(line.quantity) === 0 && Number(line.rejectedQuantity) > 0,
  );

  if (allRejected) {
    return ReceiptStatus.REJECTED;
  }

  const completesOrder = items.every((item) => {
    const line = lines.find(
      (candidate) => candidate.purchaseOrderItemId === item.id,
    );

    const incoming = line ? Number(line.quantity) : 0;

    return Number(item.receivedQuantity) + incoming >= Number(item.orderedQuantity);
  });

  return completesOrder ? ReceiptStatus.COMPLETE : ReceiptStatus.PARTIAL;
}

export function hasDivergence(lines: ReceiptLine[]): boolean {
  return lines.some((line) => Number(line.rejectedQuantity) > 0);
}
