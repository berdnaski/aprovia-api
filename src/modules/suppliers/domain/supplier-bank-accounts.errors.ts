import {
  ForbiddenError,
  InvalidStateError,
  ValidationError,
} from 'src/shared/domain/errors/domain.error';

export class InvalidBankCodeError extends ValidationError {
  constructor(bankCode: string) {
    super(
      `O código do banco "${bankCode}" precisa ter 3 dígitos, como 341 para o Itaú.`,
      { bankCode },
    );
  }
}

export class InvalidHolderDocumentError extends ValidationError {
  constructor() {
    super(
      'O CPF ou CNPJ do titular da conta não é válido. Confira se digitou corretamente.',
    );
  }
}

export class InvalidPixKeyError extends ValidationError {
  constructor(pixKeyType: string) {
    super(
      `A chave PIX informada não é uma chave do tipo ${pixKeyType} válida.`,
      { pixKeyType },
    );
  }
}

export class ThirdPartyJustificationRequiredError extends ValidationError {
  constructor() {
    super(
      'Como o titular da conta é diferente do fornecedor, explique o motivo em pelo menos 10 caracteres. Isso fica registrado para quem for aprovar.',
    );
  }
}

export class BankAccountNotPendingError extends InvalidStateError {
  constructor() {
    super(
      'Esta conta bancária já foi analisada e não está mais aguardando aprovação.',
    );
  }
}

export class BankAccountNotApprovedError extends InvalidStateError {
  constructor() {
    super('Esta conta bancária não está aprovada.');
  }
}

export class SameReviewerError extends ForbiddenError {
  constructor() {
    super(
      'Quem cadastrou esta conta bancária não pode aprová-la ou recusá-la. Peça a outro Admin Financeiro ou Aprovador para revisar.',
    );
  }
}

export class ReviewJustificationRequiredError extends ValidationError {
  constructor() {
    super(
      'Explique o motivo da recusa em pelo menos 10 caracteres. Quem cadastrou vai ler esta justificativa.',
    );
  }
}
