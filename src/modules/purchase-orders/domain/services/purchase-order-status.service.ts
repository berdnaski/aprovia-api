import { PurchaseOrderStatus } from 'generated/prisma/enums';

export interface ItemReceiptProgress {
  orderedQuantity: string;
  receivedQuantity: string;
}

export function resolveStatusAfterReceipt(
  items: ItemReceiptProgress[],
): PurchaseOrderStatus {
  const fullyReceived = items.every(
    (item) => Number(item.receivedQuantity) >= Number(item.orderedQuantity),
  );

  if (fullyReceived) {
    return PurchaseOrderStatus.RECEIVED;
  }

  const hasAnyReceipt = items.some((item) => Number(item.receivedQuantity) > 0);

  return hasAnyReceipt
    ? PurchaseOrderStatus.PARTIALLY_RECEIVED
    : PurchaseOrderStatus.ISSUED;
}

export function pendingQuantity(item: ItemReceiptProgress): string {
  const pending = Number(item.orderedQuantity) - Number(item.receivedQuantity);

  return (pending > 0 ? pending : 0).toFixed(3);
}
