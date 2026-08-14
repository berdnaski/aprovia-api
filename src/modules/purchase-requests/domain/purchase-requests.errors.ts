import {
  ConflictError,
  ForbiddenError,
  InvalidStateError,
  ValidationError,
} from 'src/shared/domain/errors/domain.error';

export class RequestNotDraftError extends InvalidStateError {
  constructor(number: string, status: string) {
    super(
      `O pedido ${number} já saiu do rascunho e entrou no fluxo de aprovação, por isso não pode mais ser editado. Cancele-o e crie um novo se precisar mudar algo.`,
      { number, status },
    );
  }
}

export class RequestNotOwnedError extends ForbiddenError {
  constructor() {
    super('Só quem criou o rascunho pode editá-lo.');
  }
}

export class RequestNotVisibleError extends ForbiddenError {
  constructor() {
    super(
      'Você não tem acesso a este pedido. Ele pertence a um Centro de Custo do qual você não faz parte.',
    );
  }
}

export class RequestNumberExhaustedError extends ConflictError {
  constructor() {
    super(
      'Não foi possível gerar o número do pedido agora. Tente enviar novamente em alguns instantes.',
    );
  }
}

export class EmptyRequestError extends ValidationError {
  constructor() {
    super('Adicione pelo menos um item ao pedido antes de enviá-lo.');
  }
}

export class FileTooLargeError extends ValidationError {
  constructor(sizeBytes: number, maxBytes: number) {
    super(
      `Este arquivo tem ${Math.round(sizeBytes / 1024)} KB e o limite é ${Math.round(maxBytes / 1024)} KB. Envie uma versão menor ou compacte o arquivo.`,
      { sizeBytes, maxBytes },
    );
  }
}

export class UnsupportedFileTypeError extends ValidationError {
  constructor(declaredMimeType: string) {
    super(
      'Só é possível anexar arquivos PDF ou imagens (JPG, PNG). Converta o arquivo e tente novamente.',
      { declaredMimeType },
    );
  }
}

export class MimeTypeMismatchError extends ValidationError {
  constructor(declared: string, detected: string) {
    super(
      'O conteúdo deste arquivo não corresponde à extensão do nome dele. Abra o arquivo, confirme que está correto e salve-o novamente antes de anexar.',
      { declared, detected },
    );
  }
}
