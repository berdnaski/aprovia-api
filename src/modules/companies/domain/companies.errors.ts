import {
  ConflictError,
  ValidationError,
} from 'src/shared/domain/errors/domain.error';

export class LastAdminError extends ConflictError {
  constructor() {
    super('A empresa precisa manter ao menos um Admin Financeiro ativo');
  }
}

export class SelfManagerError extends ValidationError {
  constructor() {
    super('O membro não pode ser o próprio líder');
  }
}

export class SelfSubstituteError extends ValidationError {
  constructor() {
    super('O membro não pode ser o próprio substituto');
  }
}

export class HierarchyCycleError extends ValidationError {
  constructor() {
    super('A alteração criaria um ciclo na hierarquia de aprovação');
  }
}

export class SubstituteDelegationError extends ValidationError {
  constructor() {
    super('O substituto não pode estar ausente com substituto próprio');
  }
}

export class InvalidAbsencePeriodError extends ValidationError {
  constructor() {
    super('A data final da ausência deve ser posterior à inicial');
  }
}
