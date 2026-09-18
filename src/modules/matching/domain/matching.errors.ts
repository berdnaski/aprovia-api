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

const PAYABLE_STATUS_LABEL: Record<string, string> = {
  RELEASED: 'já está liberada',
  PAID: 'já foi paga',
  CANCELED: 'foi cancelada',
};

export class PayableNotBlockedError extends InvalidStateError {
  constructor(status: string) {
    super(
      `Esta conta a pagar ${PAYABLE_STATUS_LABEL[status] ?? 'não está aguardando liberação'}, não há o que liberar.`,
      { status },
    );
  }
}

export class PayableConferralPendingError extends InvalidStateError {
  constructor() {
    super(
      'A nota desta conta ainda não passou na conferência. Resolva a conferência antes de liberar o pagamento.',
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

export class PayableAllocationSharesError extends ValidationError {
  constructor(totalBps: number) {
    super(
      `O rateio precisa somar 100%, e hoje soma ${(totalBps / 100).toLocaleString('pt-BR')}%. Ajuste os percentuais.`,
      { totalBps },
    );
  }
}

export class PayableAllocationLineDuplicatedError extends ValidationError {
  constructor() {
    super(
      'O rateio repete o mesmo centro de custo com a mesma conta. Junte as linhas em uma só.',
    );
  }
}
