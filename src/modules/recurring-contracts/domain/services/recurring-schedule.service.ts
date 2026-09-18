import { RecurringFrequency } from 'generated/prisma/enums';

const MONTHS_PER_FREQUENCY: Record<RecurringFrequency, number> = {
  MONTHLY: 1,
  QUARTERLY: 3,
  ANNUAL: 12,
};

export interface RecurringCycle {
  periodStart: Date;
  periodEnd: Date;
  dueDate: Date;
}

function atUtcMidnight(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

export function cycleFor(
  frequency: RecurringFrequency,
  cycleStart: Date,
): RecurringCycle {
  const start = atUtcMidnight(cycleStart);
  const months = MONTHS_PER_FREQUENCY[frequency];

  const periodEnd = new Date(
    Date.UTC(
      start.getUTCFullYear(),
      start.getUTCMonth() + months,
      start.getUTCDate() - 1,
    ),
  );

  return { periodStart: start, periodEnd, dueDate: start };
}

export function nextCycleStart(
  frequency: RecurringFrequency,
  cycleStart: Date,
): Date {
  const start = atUtcMidnight(cycleStart);
  const months = MONTHS_PER_FREQUENCY[frequency];

  return new Date(
    Date.UTC(
      start.getUTCFullYear(),
      start.getUTCMonth() + months,
      start.getUTCDate(),
    ),
  );
}

export function periodLabel(periodStart: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(periodStart);
}
