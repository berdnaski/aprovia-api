import {
  ConflictError,
  ForbiddenError,
  InvalidStateError,
  NotFoundError,
  ValidationError,
} from 'src/shared/domain/errors/domain.error';

export class RequestNotApprovedForContractError extends InvalidStateError {
  constructor(number: string) {
    super(
      `Só é possível transformar em assinatura recorrente um pedido já aprovado. O pedido ${number} ainda não está.`,
      { number },
    );
  }
}

export class RequestWithoutSupplierError extends ValidationError {
  constructor() {
    super(
      'Este pedido não tem fornecedor definido, e uma assinatura recorrente precisa de um.',
    );
  }
}

export class RequestAlreadyHasContractError extends ConflictError {
  constructor(number: string) {
    super(
      `O pedido ${number} já virou uma assinatura recorrente. Veja em Assinaturas recorrentes.`,
      { number },
    );
  }
}

export class RecurringContractNotFoundError extends NotFoundError {
  constructor(id: string) {
    super('Assinatura recorrente', id);
  }
}

export class RecurringContractForbiddenError extends ForbiddenError {
  constructor() {
    super('Esta assinatura recorrente pertence a outra empresa.');
  }
}

export class RecurringContractAlreadyCanceledError extends InvalidStateError {
  constructor() {
    super('Esta assinatura recorrente já foi cancelada.');
  }
}

export class NoOccurrenceDueError extends InvalidStateError {
  constructor() {
    super(
      'Não há nenhuma cobrança desta assinatura aguardando nota fiscal no momento.',
    );
  }
}

export class OccurrenceAlreadyMatchedError extends InvalidStateError {
  constructor() {
    super('Esta cobrança já foi conferida e ligada a outra nota fiscal.');
  }
}

export class RecurringAmountMismatchError extends ValidationError {
  constructor(expectedCents: string, actualCents: string, percent: string) {
    super(
      `O valor da nota difere ${percent}% do esperado para este ciclo (${expectedCents} centavos, veio ${actualCents}). Para ligar mesmo assim, explique o motivo em pelo menos 10 caracteres.`,
      { expectedCents, actualCents, percent },
    );
  }
}

export class RecurringSupplierMismatchError extends ValidationError {
  constructor() {
    super(
      'O CNPJ do emitente desta nota não é o fornecedor da assinatura recorrente. Confira se a nota é a certa antes de ligar.',
    );
  }
}
