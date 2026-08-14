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
    super(
      'Este é o último Admin Financeiro ativo da empresa. Promova outro membro a Admin Financeiro antes de continuar.',
    );
  }
}

export class OnboardingIncompleteError extends ConflictError {
  constructor(pending: string[]) {
    super(
      `A empresa ainda não terminou a configuração inicial, então pedidos não podem ser criados. Falta: ${pending.join(', ')}.`,
      { pending },
    );
  }
}

export class SelfManagerError extends ValidationError {
  constructor() {
    super('Um membro não pode ser líder de si mesmo. Escolha outra pessoa.');
  }
}

export class SelfSubstituteError extends ValidationError {
  constructor() {
    super(
      'Um membro não pode ser substituto de si mesmo. Escolha outra pessoa.',
    );
  }
}

export class HierarchyCycleError extends ValidationError {
  constructor() {
    super(
      'Esta mudança deixaria a hierarquia circular: a pessoa passaria a ser líder de alguém que já é líder dela. Escolha outro líder.',
    );
  }
}

export class SubstituteDelegationError extends ValidationError {
  constructor() {
    super(
      'A pessoa escolhida como substituta também está ausente e já delegou para outra. Escolha alguém que esteja disponível.',
    );
  }
}

export class InvalidAbsencePeriodError extends ValidationError {
  constructor() {
    super(
      'A data de volta da ausência precisa ser depois da data de saída. Revise as datas.',
    );
  }
}

export class MemberAlreadyDisabledError extends ConflictError {
  constructor() {
    super('Este membro já está inativo, não é preciso inativar de novo.');
  }
}

export class InactiveSubstituteError extends ValidationError {
  constructor() {
    super(
      'A pessoa escolhida como substituta está inativa na empresa. Escolha um membro ativo.',
    );
  }
}

export class SubstituteNotApproverError extends ValidationError {
  constructor() {
    super(
      'Só quem tem perfil de Aprovador ou Admin Financeiro pode receber uma substituição. Escolha alguém com um desses perfis.',
    );
  }
}

export class SubstituteChainError extends ValidationError {
  constructor() {
    super(
      'A pessoa escolhida já está substituindo outro aprovador. Escolha alguém que não esteja cobrindo ninguém no momento.',
    );
  }
}

const ACTION_LABELS: Record<MemberAction, string> = {
  DEACTIVATE: 'inativar este membro',
  DEMOTE: 'mudar o perfil dele para Solicitante',
};

export class MemberHasResponsibilitiesError extends ConflictError {
  constructor(blockers: ResponsibilityBlocker[], action: MemberAction) {
    super(
      `Antes de ${ACTION_LABELS[action]}, passe as responsabilidades dele para outra pessoa: ${blockers
        .map((blocker) => blocker.message)
        .join(' e ')}.`,
      Object.fromEntries(
        blockers.map((blocker) => [blocker.kind, blocker.items]),
      ),
    );
  }
}
