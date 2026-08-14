import {
  ConflictError,
  InvalidStateError,
  NotFoundError,
  ValidationError,
} from 'src/shared/domain/errors/domain.error';

export class MatchResultNotFoundError extends NotFoundError {
  constructor() {
    super('Registro de conferência não encontrado.');
  }
}

export class MatchAlreadyResolvedError extends ConflictError {
  constructor() {
    super('Esta conferência já foi resolvida e não pode ser alterada.');
  }
}

export class MatchNotDivergentError extends InvalidStateError {
  constructor() {
    super(
      'Esta conferência não está com divergência, não há exceção para liberar.',
    );
  }
}

export class OverrideJustificationRequiredError extends ValidationError {
  constructor() {
    super(
      'Explique o motivo da liberação em pelo menos 10 caracteres. Fica registrado na auditoria.',
    );
  }
}

export class PayableNotFoundError extends NotFoundError {
  constructor() {
    super('Conta a pagar não encontrada.');
  }
}

export class PayableNotBlockedError extends InvalidStateError {
  constructor(status: string) {
    super(
      `Esta conta a pagar não está bloqueada (status ${status}), não é preciso liberar novamente.`,
      { status },
    );
  }
}

export class PayableNotReleasedError extends InvalidStateError {
  constructor() {
    super(
      'Esta conta a pagar ainda não foi liberada. Ela precisa passar pela conferência antes de ser marcada como paga.',
    );
  }
}

export class ProofRequiredError extends ValidationError {
  constructor() {
    super(
      'Anexe o comprovante da compra (recibo, invoice ou fatura) para liberar o pagamento sem nota fiscal.',
    );
  }
}

export class UnsupportedProofFileTypeError extends ValidationError {
  constructor() {
    super(
      'Não foi possível identificar o tipo deste arquivo. Envie um PDF ou uma imagem (JPG, PNG) do comprovante.',
    );
  }
}
