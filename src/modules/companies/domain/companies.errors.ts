import {
  ConflictError,
  ValidationError,
} from 'src/shared/domain/errors/domain.error';
import {
  MemberAction,
  ResponsibilityBlocker,
} from './member-responsibility-guard';

export class LastAdminError extends ConflictError {
  constructor() {
    super('A empresa precisa manter ao menos um Admin Financeiro ativo');
  }
}

export class OnboardingIncompleteError extends ConflictError {
  constructor(pending: string[]) {
    super(
      'A configuração inicial da organização ainda não foi concluída, então a criação de pedidos está bloqueada',
      { pending },
    );
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

export class MemberAlreadyDisabledError extends ConflictError {
  constructor() {
    super('Este membro já está inativo');
  }
}

export class InactiveSubstituteError extends ValidationError {
  constructor() {
    super('O substituto precisa ser um membro ativo');
  }
}

export class SubstituteNotApproverError extends ValidationError {
  constructor() {
    super('O substituto precisa ter perfil de Aprovador ou Admin Financeiro');
  }
}

export class SubstituteChainError extends ValidationError {
  constructor() {
    super(
      'Este membro já é substituto de outro aprovador e não pode delegar novamente',
    );
  }
}

const ACTION_LABELS: Record<MemberAction, string> = {
  DEACTIVATE: 'inativá-lo',
  DEMOTE: 'rebaixar seu perfil para Solicitante',
};

export class MemberHasResponsibilitiesError extends ConflictError {
  constructor(blockers: ResponsibilityBlocker[], action: MemberAction) {
    super(
      `Transfira as responsabilidades deste membro antes de ${ACTION_LABELS[action]}: ${blockers
        .map((blocker) => blocker.message)
        .join(' e ')}.`,
      Object.fromEntries(
        blockers.map((blocker) => [blocker.kind, blocker.items]),
      ),
    );
  }
}
