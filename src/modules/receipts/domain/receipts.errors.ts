import {
  ConflictError,
  ForbiddenError,
  InvalidStateError,
  NotFoundError,
  ValidationError,
} from 'src/shared/domain/errors/domain.error';

export class ReceiptNotFoundError extends NotFoundError {
  constructor() {
    super('Recebimento não encontrado.');
  }
}

export class OrderNotReceivableError extends InvalidStateError {
  constructor(number: string) {
    super(
      `A ordem de compra ${number} foi cancelada, por isso não aceita mais recebimentos.`,
      { number },
    );
  }
}

export class EmptyReceiptError extends ValidationError {
  constructor() {
    super('Informe ao menos um item recebido para registrar a entrega.');
  }
}

export class ItemNotInOrderError extends ValidationError {
  constructor() {
    super(
      'Um dos itens informados não pertence a esta ordem de compra. Confira a lista de itens antes de registrar.',
    );
  }
}

export class QuantityExceedsOrderError extends ConflictError {
  constructor(description: string, pending: string, informed: string) {
    super(
      `Faltam apenas ${pending} de "${description}" para completar a ordem, mas foram informados ${informed}. Corrija a quantidade ou peça ao fornecedor para revisar a entrega.`,
      { description, pending, informed },
    );
  }
}

export class NegativeQuantityError extends ValidationError {
  constructor() {
    super('A quantidade recebida não pode ser negativa.');
  }
}

export class RejectionReasonRequiredError extends ValidationError {
  constructor() {
    super(
      'Informe o motivo ao recusar parte da entrega. Ele fica registrado para cobrança do fornecedor.',
    );
  }
}

export class ReceiptNotOwnedError extends ForbiddenError {
  constructor() {
    super(
      'Só quem fez o pedido original (ou o Admin Financeiro) pode registrar o recebimento desta ordem de compra.',
    );
  }
}

export class ReceiptNumberExhaustedError extends ConflictError {
  constructor() {
    super(
      'Não foi possível gerar o número do recebimento agora. Tente novamente em alguns instantes.',
    );
  }
}
