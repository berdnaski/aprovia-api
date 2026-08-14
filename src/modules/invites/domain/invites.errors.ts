import {
  ConflictError,
  ForbiddenError,
  InvalidStateError,
} from 'src/shared/domain/errors/domain.error';

export class DuplicatePendingInviteError extends ConflictError {
  constructor(email: string) {
    super(
      `${email} já tem um convite aguardando resposta. Reenvie o convite existente em vez de criar outro.`,
      { email },
    );
  }
}

export class InviteNotPendingError extends InvalidStateError {
  constructor(status: string) {
    super(
      'Este convite não está mais aguardando resposta: ele já foi aceito, cancelado ou expirou. Peça um novo convite.',
      { status },
    );
  }
}

export class InviteEmailMismatchError extends ForbiddenError {
  constructor() {
    super(
      'Este convite foi enviado para outro e-mail. Saia e entre com a conta do e-mail que recebeu o convite.',
    );
  }
}

export class AlreadyMemberError extends ConflictError {
  constructor() {
    super('Você já faz parte desta empresa, não precisa aceitar o convite.');
  }
}
