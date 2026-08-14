import {
  ConflictError,
  InvalidStateError,
  NotFoundError,
  ValidationError,
} from 'src/shared/domain/errors/domain.error';

export class InvoiceNotFoundError extends NotFoundError {
  constructor() {
    super('Nota fiscal não encontrada.');
  }
}

export class InvoiceParseFailedError extends ValidationError {
  constructor(reason: string) {
    super(
      `Não foi possível ler este arquivo XML: ${reason}. Confira se é o XML original da NFe, não o PDF (DANFE).`,
      { reason },
    );
  }
}

export class InvoiceAlreadyRegisteredError extends ConflictError {
  constructor(number: string) {
    super(
      `Esta nota fiscal (${number}) já foi cadastrada nesta empresa. Não é possível lançar a mesma nota duas vezes.`,
      { number },
    );
  }
}

export class InvoiceRecipientMismatchError extends ValidationError {
  constructor() {
    super(
      'O CNPJ de destino desta nota fiscal não é o desta empresa. Confira se o arquivo é o correto.',
    );
  }
}

export class InvoiceAlreadyResolvedError extends InvalidStateError {
  constructor(status: string) {
    super(
      `Esta nota fiscal já foi processada (status ${status}) e não pode ser alterada.`,
      { status },
    );
  }
}

export class InvoiceReceiptRequiredError extends InvalidStateError {
  constructor() {
    super(
      'Esta empresa exige que a mercadoria seja recebida antes de aceitar a nota fiscal. Registre o recebimento primeiro.',
    );
  }
}

export class InvoiceOrderMismatchError extends ValidationError {
  constructor() {
    super(
      'Esta nota não pôde ser associada automaticamente a uma ordem de compra. Vincule manualmente à ordem correspondente.',
    );
  }
}
