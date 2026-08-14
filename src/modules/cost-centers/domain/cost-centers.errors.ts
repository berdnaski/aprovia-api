import {
  ConflictError,
  ForbiddenError,
  ValidationError,
} from 'src/shared/domain/errors/domain.error';
import {
  COST_CENTER_USAGE_KINDS,
  CostCenterUsageKind,
} from './cost-centers.repository.interface';

export class CostCenterNameTakenError extends ConflictError {
  constructor() {
    super(
      'Já existe um Centro de Custo com este nome ou código na empresa. Escolha outro nome ou código.',
    );
  }
}

export class InvalidCostCenterManagerError extends ValidationError {
  constructor() {
    super(
      'Quem responde por um Centro de Custo precisa ser um membro ativo com perfil de Aprovador ou Admin Financeiro. Escolha outra pessoa.',
    );
  }
}

export class SelfParentCostCenterError extends ValidationError {
  constructor() {
    super(
      'Um Centro de Custo não pode estar dentro dele mesmo. Escolha outro Centro de Custo como pai.',
    );
  }
}

export class CostCenterCycleError extends ValidationError {
  constructor() {
    super(
      'Esta mudança deixaria a estrutura circular: o Centro de Custo pai escolhido já está abaixo deste. Escolha outro pai.',
    );
  }
}

export class InactiveParentCostCenterError extends ValidationError {
  constructor() {
    super(
      'O Centro de Custo pai escolhido está inativo. Reative-o ou escolha outro.',
    );
  }
}

export class CostCenterAlreadyDisabledError extends ConflictError {
  constructor() {
    super(
      'Este Centro de Custo já está inativo, não é preciso inativar de novo.',
    );
  }
}

export class CostCenterHasActiveChildrenError extends ConflictError {
  constructor(children: number) {
    super(
      `Este Centro de Custo tem ${children} Centro(s) de Custo abaixo dele ainda ativos. Inative-os ou mova-os para outro pai antes de continuar.`,
      { activeChildren: children },
    );
  }
}

const USAGE_LABELS: Record<CostCenterUsageKind, string> = {
  purchaseRequests: 'pedidos',
  budgets: 'orçamentos',
  linkedMembers: 'membros vinculados',
  children: 'Centros de Custo abaixo dele',
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
      `Este Centro de Custo já tem histórico na empresa (${summary}) e por isso não pode ser excluído. Inative-o: ele some das listas e o histórico é preservado.`,
      breakdown,
    );
  }
}

export class MemberAlreadyLinkedError extends ConflictError {
  constructor() {
    super('Esta pessoa já tem acesso a este Centro de Custo.');
  }
}

export class MemberNotLinkedError extends ConflictError {
  constructor() {
    super('Esta pessoa não tem acesso a este Centro de Custo.');
  }
}

export class CostCenterNotAssignedError extends ForbiddenError {
  constructor() {
    super(
      'Você não tem acesso a este Centro de Custo. Peça ao Admin Financeiro para liberar seu acesso.',
    );
  }
}
