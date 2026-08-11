import {
  ConflictError,
  ValidationError,
} from 'src/shared/domain/errors/domain.error';
import {
  COST_CENTER_USAGE_KINDS,
  CostCenterUsageKind,
} from './cost-centers.repository.interface';

export class CostCenterNameTakenError extends ConflictError {
  constructor() {
    super('Já existe um Centro de Custo com este nome ou código na empresa');
  }
}

export class InvalidCostCenterManagerError extends ValidationError {
  constructor() {
    super(
      'O gestor do Centro de Custo precisa ser um membro ativo com perfil de Aprovador ou Admin Financeiro',
    );
  }
}

export class SelfParentCostCenterError extends ValidationError {
  constructor() {
    super('O Centro de Custo não pode ser pai de si mesmo');
  }
}

export class CostCenterCycleError extends ValidationError {
  constructor() {
    super('A alteração criaria um ciclo na hierarquia de Centros de Custo');
  }
}

export class InactiveParentCostCenterError extends ValidationError {
  constructor() {
    super('O Centro de Custo pai precisa estar ativo');
  }
}

export class CostCenterAlreadyDisabledError extends ConflictError {
  constructor() {
    super('Este Centro de Custo já está inativo');
  }
}

export class CostCenterHasActiveChildrenError extends ConflictError {
  constructor(children: number) {
    super(
      `Inative ou reposicione os ${children} Centros de Custo filhos antes de inativar este`,
      { activeChildren: children },
    );
  }
}

const USAGE_LABELS: Record<CostCenterUsageKind, string> = {
  purchaseRequests: 'pedidos',
  budgets: 'orçamentos',
  linkedMembers: 'membros vinculados',
  children: 'Centros de Custo filhos',
  defaultOfMembers: 'membros que o usam como padrão',
  approvalRules: 'regras de alçada',
};

export type CostCenterUsageBreakdown = Partial<
  Record<CostCenterUsageKind, number>
>;

export class CostCenterInUseError extends ConflictError {
  constructor(breakdown: CostCenterUsageBreakdown) {
    const summary = COST_CENTER_USAGE_KINDS.filter(
      (kind) => (breakdown[kind] ?? 0) > 0,
    )
      .map((kind) => `${breakdown[kind]} ${USAGE_LABELS[kind]}`)
      .join(', ');

    super(
      `Este Centro de Custo não pode ser excluído porque já possui histórico: ${summary}. Use a inativação.`,
      breakdown,
    );
  }
}

export class MemberAlreadyLinkedError extends ConflictError {
  constructor() {
    super('Este membro já está vinculado ao Centro de Custo');
  }
}

export class MemberNotLinkedError extends ConflictError {
  constructor() {
    super('Este membro não está vinculado ao Centro de Custo');
  }
}
