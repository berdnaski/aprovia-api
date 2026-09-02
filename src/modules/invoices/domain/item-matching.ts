export interface MatchableItem {
  id: string;
  description: string;
}

export interface IncomingItem {
  sequence: number;
  description: string;
}

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 2)
    .join(' ');
}

function tokens(value: string): Set<string> {
  return new Set(normalize(value).split(' ').filter(Boolean));
}

export function similarity(left: string, right: string): number {
  const a = tokens(left);
  const b = tokens(right);

  if (a.size === 0 || b.size === 0) {
    return 0;
  }

  let shared = 0;

  for (const token of a) {
    if (b.has(token)) {
      shared += 1;
    }
  }

  return shared / Math.min(a.size, b.size);
}

const MIN_SIMILARITY = 0.6;

export function linkInvoiceItems(
  incoming: IncomingItem[],
  orderItems: MatchableItem[],
): Map<number, string> {
  const taken = new Set<string>();
  const links = new Map<number, string>();

  const scored = incoming
    .flatMap((item) =>
      orderItems.map((orderItem) => ({
        sequence: item.sequence,
        orderItemId: orderItem.id,
        score: similarity(item.description, orderItem.description),
      })),
    )
    .filter((pair) => pair.score >= MIN_SIMILARITY)
    .sort((a, b) => b.score - a.score);

  for (const pair of scored) {
    if (links.has(pair.sequence) || taken.has(pair.orderItemId)) {
      continue;
    }

    links.set(pair.sequence, pair.orderItemId);
    taken.add(pair.orderItemId);
  }

  return links;
}
