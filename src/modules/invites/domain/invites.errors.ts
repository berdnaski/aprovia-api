import {
  ConflictError,
  ForbiddenError,
  InvalidStateError,
} from 'src/shared/domain/errors/domain.error';

export class DuplicatePendingInviteError extends ConflictError {
  constructor(email: string) {
    super(
      `Já existe um convite pendente para ${email}. Reenvie o convite existente em vez de emitir outro`,
      { email },
    );
  }
}

export class InviteNotPendingError extends InvalidStateError {
  constructor(status: string) {
    super(`Este convite não está mais pendente (${status})`, { status });
  }
}

export class InviteEmailMismatchError extends ForbiddenError {
  constructor() {
    super(
      'Este convite foi emitido para outro endereço de e-mail. Entre com a conta que recebeu o convite',
    );
  }
}

export class AlreadyMemberError extends ConflictError {
  constructor() {
    super('Você já faz parte desta organização');
  }
}
