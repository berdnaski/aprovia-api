import {
  ConflictError,
  ValidationError,
} from 'src/shared/domain/errors/domain.error';

function formatPeriod(date: Date): string {
  return date.toISOString().slice(0, 10).split('-').reverse().join('/');
}

export class BudgetPeriodTakenError extends ConflictError {
  constructor(periodStart: Date) {
    super(
      `Este Centro de Custo já tem um orçamento começando em ${formatPeriod(periodStart)}. Edite o orçamento existente em vez de criar outro.`,
      { periodStart: periodStart.toISOString().slice(0, 10) },
    );
  }
}

export class InvalidBudgetPeriodError extends ValidationError {
  constructor() {
    super(
      'Informe o período no formato AAAA-MM. Orçamento trimestral precisa começar em janeiro, abril, julho ou outubro; o anual, em janeiro.',
    );
  }
}

export class BudgetPeriodOverlapError extends ConflictError {
  constructor(periodStart: Date, periodEnd: Date) {
    super(
      `Já existe um orçamento deste Centro de Custo cobrindo de ${formatPeriod(periodStart)} a ${formatPeriod(periodEnd)}. Dois orçamentos não podem cobrir o mesmo mês.`,
      {
        existingPeriodStart: periodStart.toISOString().slice(0, 10),
        existingPeriodEnd: periodEnd.toISOString().slice(0, 10),
      },
    );
  }
}

export class NegativeBudgetError extends ValidationError {
  constructor() {
    super('O valor do orçamento não pode ser negativo. Informe zero ou mais.');
  }
}

export class BudgetNotFoundForPeriodError extends ValidationError {
  constructor(periodStart: Date) {
    super(
      `Este Centro de Custo não tem orçamento definido para o período que começa em ${formatPeriod(periodStart)}. Peça ao Admin Financeiro para cadastrar o orçamento.`,
      { periodStart: periodStart.toISOString().slice(0, 10) },
    );
  }
}

export class InactiveCostCenterBudgetError extends ValidationError {
  constructor() {
    super(
      'Este Centro de Custo está inativo e por isso não aceita orçamento. Reative-o primeiro.',
    );
  }
}
