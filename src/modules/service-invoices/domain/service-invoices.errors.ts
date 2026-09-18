import {
  ConflictError,
  ForbiddenError,
  InvalidStateError,
  NotFoundError,
  ValidationError,
} from 'src/shared/domain/errors/domain.error';

export class ServiceInvoiceNotFoundError extends NotFoundError {
  constructor() {
    super('Nota fiscal de serviço não encontrada.');
  }
}

export class ServiceInvoiceForbiddenError extends ForbiddenError {
  constructor() {
    super('Esta nota fiscal de serviço pertence a outra empresa.');
  }
}

export class ServiceInvoiceParseFailedError extends ValidationError {
  constructor(reason: string) {
    super(
      `Não foi possível ler este arquivo XML: ${reason}. Confira se é o XML da NFS-e no padrão nacional (não o PDF/DANFSE).`,
      { reason },
    );
  }
}

export class ServiceInvoiceAlreadyRegisteredError extends ConflictError {
  constructor(number: string) {
    super(
      `Esta nota de serviço (${number}) já foi cadastrada nesta empresa.`,
      { number },
    );
  }
}

export class ServiceInvoiceRecipientMismatchError extends ValidationError {
  constructor() {
    super(
      'O CNPJ do tomador desta nota de serviço não é o desta empresa. Confira se o arquivo é o correto.',
    );
  }
}

export class ServiceInvoiceAlreadyResolvedError extends InvalidStateError {
  constructor(status: string) {
    super(
      `Esta nota de serviço já foi processada (status ${status}) e não pode ser alterada.`,
      { status },
    );
  }
}
