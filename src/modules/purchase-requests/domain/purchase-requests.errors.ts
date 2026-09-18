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

export class AllocationSharesError extends ValidationError {
  constructor(totalBps: number) {
    super(
      `O rateio precisa somar 100%, e hoje soma ${(totalBps / 100).toLocaleString('pt-BR')}%. Ajuste os percentuais.`,
      { totalBps },
    );
  }
}

export class AllocationLineDuplicatedError extends ValidationError {
  constructor() {
    super(
      'O rateio repete o mesmo centro de custo com a mesma conta. Junte as linhas em uma só.',
    );
  }
}

export class PrimaryCostCenterMissingError extends ValidationError {
  constructor() {
    super(
      'O centro de custo do pedido precisa aparecer no rateio, porque é ele que define quem aprova.',
    );
  }
}

export class AllocationLockedError extends InvalidStateError {
  constructor(number: string) {
    super(
      `O pedido ${number} já está em aprovação. Nesta etapa só a conta contábil de cada linha pode mudar, não os centros de custo nem os percentuais.`,
      { number },
    );
  }
}

export class AllocationForbiddenError extends ForbiddenError {
  constructor() {
    super(
      'Só quem criou o rascunho pode mudar o rateio. Depois do envio, apenas o Admin Financeiro ajusta a conta contábil.',
    );
  }
}

export class CostCenterWithoutBudgetError extends ValidationError {
  constructor(costCenterName: string) {
    super(
      `O centro de custo ${costCenterName} não tem orçamento para este mês. Peça ao Admin Financeiro para cadastrar o orçamento ou tire-o do rateio.`,
      { costCenterName },
    );
  }
}
