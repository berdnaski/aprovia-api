import { BudgetEntity } from '../budget.entity';
import { BudgetBalanceService, BudgetVerdict } from './budget-balance.service';

const budgetOf = (totalAmountCents: bigint): BudgetEntity => {
  const budget = new BudgetEntity();
  budget.id = 'budget-1';
  budget.costCenterId = 'cc-1';
  budget.periodStart = new Date(Date.UTC(2026, 1, 1));
  budget.periodEnd = new Date(Date.UTC(2026, 1, 28));
  budget.totalAmountCents = totalAmountCents;
  return budget;
};

describe('BudgetBalanceService', () => {
  const service = new BudgetBalanceService();

  describe('build', () => {
    it('deriva o disponível da soma do extrato', () => {
      const balance = service.build(budgetOf(1000000n), 750000n);

      expect(balance.committedCents).toBe(750000n);
      expect(balance.availableCents).toBe(250000n);
      expect(balance.usagePercent).toBe(75);
    });

    it('um REVERSAL negativo devolve o valor ao saldo', () => {
      const balance = service.build(budgetOf(1000000n), 750000n - 250000n);

      expect(balance.availableCents).toBe(500000n);
    });

    it('expõe o em análise separadamente, sem deduzir do saldo (RN17)', () => {
      const balance = service.build(budgetOf(1000000n), 500000n, 200000n);

      expect(balance.underReviewCents).toBe(200000n);
      expect(balance.availableCents).toBe(500000n);
    });

    it('permite saldo negativo quando o comprometido excede o teto', () => {
      expect(service.build(budgetOf(100n), 150n).availableCents).toBe(-50n);
    });

    it('não divide por zero quando o orçamento é zero', () => {
      expect(service.build(budgetOf(0n), 0n).usagePercent).toBe(0);
      expect(service.build(budgetOf(0n), 10n).usagePercent).toBe(100);
    });
  });

  describe('assess', () => {
    const balance = service.build(budgetOf(1000000n), 750000n);

    it('cabe no saldo disponível', () => {
      expect(service.assess(balance, 250000n, 5).verdict).toBe(
        BudgetVerdict.FITS,
      );
    });

    it('estouro dentro da margem de 5% segue o fluxo padrão (RN18)', () => {
      const result = service.assess(balance, 300000n, 5);

      expect(result.verdict).toBe(BudgetVerdict.WITHIN_TOLERANCE);
      expect(result.overrunCents).toBe(50000n);
      expect(result.toleranceCents).toBe(50000n);
    });

    it('estouro acima da margem exige ressalva (RN19)', () => {
      expect(service.assess(balance, 310000n, 5).verdict).toBe(
        BudgetVerdict.REQUIRES_OVERRIDE,
      );
    });

    it('tolerância zero rejeita qualquer estouro', () => {
      expect(service.assess(balance, 250001n, 0).verdict).toBe(
        BudgetVerdict.REQUIRES_OVERRIDE,
      );
    });

    it('tolerância é calculada sobre o teto do período, não sobre o disponível', () => {
      expect(service.assess(balance, 300000n, 5).toleranceCents).toBe(50000n);
    });
  });
});
