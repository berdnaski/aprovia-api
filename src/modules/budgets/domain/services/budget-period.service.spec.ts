import { InvalidBudgetPeriodError } from '../budgets.errors';
import { BudgetPeriodService, BudgetPeriodType } from './budget-period.service';

const iso = (date: Date): string => date.toISOString().slice(0, 10);

describe('BudgetPeriodService', () => {
  const service = new BudgetPeriodService();

  it('resolve o mês civil (RN16)', () => {
    const period = service.fromMonthKey('2026-09');

    expect(iso(period.periodStart)).toBe('2026-09-01');
    expect(iso(period.periodEnd)).toBe('2026-09-30');
  });

  it('trata fevereiro de ano bissexto', () => {
    expect(iso(service.fromMonthKey('2028-02').periodEnd)).toBe('2028-02-29');
  });

  it('trata fevereiro de ano comum', () => {
    expect(iso(service.fromMonthKey('2026-02').periodEnd)).toBe('2026-02-28');
  });

  it('não sofre efeito de fuso: o período é um mês, não um instante', () => {
    const period = service.fromMonthKey('2026-02');

    expect(iso(period.periodStart)).toBe('2026-02-01');
    expect(iso(period.periodEnd)).toBe('2026-02-28');
  });

  it('resolve trimestre (RF29)', () => {
    const period = service.fromMonthKey('2026-04', BudgetPeriodType.QUARTERLY);

    expect(iso(period.periodStart)).toBe('2026-04-01');
    expect(iso(period.periodEnd)).toBe('2026-06-30');
  });

  it('resolve ano (RF29)', () => {
    const period = service.fromMonthKey('2026-01', BudgetPeriodType.ANNUAL);

    expect(iso(period.periodStart)).toBe('2026-01-01');
    expect(iso(period.periodEnd)).toBe('2026-12-31');
  });

  it('rejeita trimestre que não começa em mês de trimestre', () => {
    expect(() =>
      service.fromMonthKey('2026-02', BudgetPeriodType.QUARTERLY),
    ).toThrow(InvalidBudgetPeriodError);
  });

  it('rejeita ano que não começa em janeiro', () => {
    expect(() =>
      service.fromMonthKey('2026-03', BudgetPeriodType.ANNUAL),
    ).toThrow(InvalidBudgetPeriodError);
  });

  it('rejeita formato inválido', () => {
    expect(() => service.fromMonthKey('2026-13')).toThrow(
      InvalidBudgetPeriodError,
    );
    expect(() => service.fromMonthKey('26-01')).toThrow(
      InvalidBudgetPeriodError,
    );
  });

  it('avança para o próximo mês virando o ano', () => {
    expect(service.nextMonthKey('2026-12')).toBe('2027-01');
  });
});
