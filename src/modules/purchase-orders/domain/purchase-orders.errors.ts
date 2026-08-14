import {
  ConflictError,
  InvalidStateError,
  NotFoundError,
  ValidationError,
} from 'src/shared/domain/errors/domain.error';

export class RequestNotApprovedError extends InvalidStateError {
  constructor(number: string) {
    super(
      `O pedido ${number} ainda não foi aprovado. Só é possível emitir a ordem de compra depois que todos os aprovadores decidirem.`,
      { number },
    );
  }
}

export class PurchaseOrderAlreadyIssuedError extends ConflictError {
  constructor(number: string) {
    super(
      `Este pedido já gerou a ordem de compra ${number}. Cada pedido gera apenas uma.`,
      { number },
    );
  }
}

export class PurchaseOrderNotFoundError extends NotFoundError {
  constructor() {
    super('Ordem de compra não encontrada.');
  }
}

export class SupplierRequiredError extends ValidationError {
  constructor() {
    super(
      'Este pedido não tem fornecedor definido. Informe o fornecedor no pedido antes de emitir a ordem de compra.',
    );
  }
}

export class PurchaseOrderAlreadyCanceledError extends ConflictError {
  constructor() {
    super('Esta ordem de compra já foi cancelada.');
  }
}

export class PurchaseOrderHasReceiptsError extends ConflictError {
  constructor() {
    super(
      'Parte da mercadoria já foi recebida, por isso esta ordem de compra não pode mais ser cancelada. Registre a devolução com o fornecedor.',
    );
  }
}

export class PurchaseOrderNumberExhaustedError extends ConflictError {
  constructor() {
    super(
      'Não foi possível gerar o número da ordem de compra agora. Tente novamente em alguns instantes.',
    );
  }
}
