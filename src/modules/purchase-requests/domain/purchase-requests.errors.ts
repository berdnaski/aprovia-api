import {
  ConflictError,
  ForbiddenError,
  InvalidStateError,
  ValidationError,
} from 'src/shared/domain/errors/domain.error';

export class RequestNotDraftError extends InvalidStateError {
  constructor(number: string, status: string) {
    super(
      `O pedido ${number} não está mais em rascunho (status ${status}) e não pode ser alterado (RN38)`,
      { number, status },
    );
  }
}

export class RequestNotOwnedError extends ForbiddenError {
  constructor() {
    super('Você só pode alterar rascunhos de sua própria autoria');
  }
}

export class RequestNotVisibleError extends ForbiddenError {
  constructor() {
    super('Você não tem acesso a este pedido');
  }
}

export class RequestNumberExhaustedError extends ConflictError {
  constructor() {
    super(
      'Não foi possível gerar um número único para o pedido. Tente novamente',
    );
  }
}

export class EmptyRequestError extends ValidationError {
  constructor() {
    super('O pedido precisa de ao menos um item para ser submetido');
  }
}

export class FileTooLargeError extends ValidationError {
  constructor(sizeBytes: number, maxBytes: number) {
    super(
      `Arquivo de ${Math.round(sizeBytes / 1024)} KB excede o limite de ${Math.round(maxBytes / 1024)} KB`,
      { sizeBytes, maxBytes },
    );
  }
}

export class UnsupportedFileTypeError extends ValidationError {
  constructor(declaredMimeType: string) {
    super(
      `Tipo de arquivo não suportado. A assinatura do arquivo não corresponde a um PDF ou imagem (declarado: ${declaredMimeType})`,
      { declaredMimeType },
    );
  }
}

export class MimeTypeMismatchError extends ValidationError {
  constructor(declared: string, detected: string) {
    super(
      `A extensão do arquivo não corresponde ao conteúdo: declarado ${declared}, detectado ${detected}`,
      { declared, detected },
    );
  }
}
