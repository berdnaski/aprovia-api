import {
  ConflictError,
  ValidationError,
} from 'src/shared/domain/errors/domain.error';

export class BudgetPeriodTakenError extends ConflictError {
  constructor(periodStart: Date) {
    super('Já existe orçamento para este Centro de Custo neste período', {
      periodStart: periodStart.toISOString().slice(0, 10),
    });
  }
}

export class InvalidBudgetPeriodError extends ValidationError {
  constructor() {
    super(
      'Período inválido: use AAAA-MM. Trimestral começa em janeiro, abril, julho ou outubro; anual começa em janeiro',
    );
  }
}

export class BudgetPeriodOverlapError extends ConflictError {
  constructor(periodStart: Date, periodEnd: Date) {
    super(
      'Já existe um orçamento cobrindo parte deste período neste Centro de Custo',
      {
        existingPeriodStart: periodStart.toISOString().slice(0, 10),
        existingPeriodEnd: periodEnd.toISOString().slice(0, 10),
      },
    );
  }
}

export class NegativeBudgetError extends ValidationError {
  constructor() {
    super('O valor do orçamento não pode ser negativo');
  }
}

export class BudgetNotFoundForPeriodError extends ValidationError {
  constructor(periodStart: Date) {
    super('Não há orçamento definido para este Centro de Custo no período', {
      periodStart: periodStart.toISOString().slice(0, 10),
    });
  }
}

export class InactiveCostCenterBudgetError extends ValidationError {
  constructor() {
    super('Não é possível definir orçamento para um Centro de Custo inativo');
  }
}
