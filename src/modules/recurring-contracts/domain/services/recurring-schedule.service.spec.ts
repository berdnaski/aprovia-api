import { RecurringFrequency } from 'generated/prisma/enums';
import {
  cycleFor,
  nextCycleStart,
  periodLabel,
} from './recurring-schedule.service';

describe('cycleFor', () => {
  it('fecha o ciclo mensal um dia antes do próximo mês', () => {
    const cycle = cycleFor(RecurringFrequency.MONTHLY, new Date('2026-01-15'));

    expect(cycle.periodStart.toISOString().slice(0, 10)).toBe('2026-01-15');
    expect(cycle.periodEnd.toISOString().slice(0, 10)).toBe('2026-02-14');
    expect(cycle.dueDate).toEqual(cycle.periodStart);
  });

  it('soma 3 meses para o ciclo trimestral', () => {
    const cycle = cycleFor(
      RecurringFrequency.QUARTERLY,
      new Date('2026-01-01'),
    );

    expect(cycle.periodEnd.toISOString().slice(0, 10)).toBe('2026-03-31');
  });

  it('soma 12 meses para o ciclo anual', () => {
    const cycle = cycleFor(RecurringFrequency.ANNUAL, new Date('2026-01-01'));

    expect(cycle.periodEnd.toISOString().slice(0, 10)).toBe('2026-12-31');
  });
});

describe('nextCycleStart', () => {
  it('avança um mês mantendo o dia', () => {
    const next = nextCycleStart(
      RecurringFrequency.MONTHLY,
      new Date('2026-01-15'),
    );

    expect(next.toISOString().slice(0, 10)).toBe('2026-02-15');
  });

  it('atravessa o fim de ano', () => {
    const next = nextCycleStart(
      RecurringFrequency.MONTHLY,
      new Date('2026-12-15'),
    );

    expect(next.toISOString().slice(0, 10)).toBe('2027-01-15');
  });
});

describe('periodLabel', () => {
  it('formata mês e ano por extenso em português', () => {
    expect(periodLabel(new Date('2026-03-01'))).toBe('março de 2026');
  });
});
