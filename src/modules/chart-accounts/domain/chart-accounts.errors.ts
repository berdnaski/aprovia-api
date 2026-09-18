import {
  ConflictError,
  InvalidStateError,
  ValidationError,
} from 'src/shared/domain/errors/domain.error';

export class ChartAccountCodeTakenError extends ConflictError {
  constructor(code: string) {
    super(`Já existe uma conta com o código ${code} no plano de contas.`, {
      code,
    });
  }
}

export class InvalidAccountCodeError extends ValidationError {
  constructor(code: string) {
    super(
      `O código "${code}" não é válido. Use apenas números separados por ponto, como 4.1.01.`,
      { code },
    );
  }
}

export class ParentAccountMismatchError extends ValidationError {
  constructor(code: string, parentCode: string) {
    super(
      `A conta ${code} precisa começar com o código da conta superior ${parentCode}.`,
      { code, parentCode },
    );
  }
}

export class ParentAccountNotFoundError extends ValidationError {
  constructor(parentCode: string) {
    super(
      `A conta superior ${parentCode} não existe no plano. Cadastre-a antes das contas abaixo dela.`,
      { parentCode },
    );
  }
}

export class PostableParentError extends ValidationError {
  constructor(parentCode: string) {
    super(
      `A conta ${parentCode} recebe lançamentos e não pode ter contas abaixo dela. Transforme-a em conta de agrupamento primeiro.`,
      { parentCode },
    );
  }
}

export class ParentKindMismatchError extends ValidationError {
  constructor(code: string) {
    super(`A conta ${code} precisa ter a mesma natureza da conta superior.`, {
      code,
    });
  }
}

export class AccountWithChildrenError extends InvalidStateError {
  constructor(code: string) {
    super(
      `A conta ${code} tem contas abaixo dela ativas. Inative as contas de baixo antes.`,
      { code },
    );
  }
}

export class GroupAccountCannotPostError extends InvalidStateError {
  constructor(code: string) {
    super(
      `A conta ${code} agrupa outras contas e não pode receber lançamentos.`,
      { code },
    );
  }
}

export class ChartAlreadyExistsError extends ConflictError {
  constructor() {
    super(
      'A empresa já tem um plano de contas. Importe uma planilha para complementar o plano atual.',
    );
  }
}

export class InactiveAccountError extends ValidationError {
  constructor(code: string) {
    super(
      `A conta ${code} está inativa. Escolha outra conta ou peça ao Admin Financeiro para reativá-la.`,
      { code },
    );
  }
}

export class NonPurchaseAccountError extends ValidationError {
  constructor(code: string) {
    super(
      `A conta ${code} não é de despesa, custo ou ativo e não pode receber compras.`,
      { code },
    );
  }
}

export class ChartImportError extends ValidationError {
  constructor(problems: string[]) {
    super(
      `A planilha tem ${problems.length} ${problems.length === 1 ? 'problema' : 'problemas'} e nada foi importado. ${problems.slice(0, 5).join(' ')}`,
      { problems },
    );
  }
}
