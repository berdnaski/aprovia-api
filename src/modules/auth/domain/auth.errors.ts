import {
  ForbiddenError,
  ValidationError,
} from 'src/shared/domain/errors/domain.error';

export class InvalidCredentialsError extends ValidationError {
  constructor() {
    super('Credenciais inválidas');
  }
}

export class InvalidTokenError extends ValidationError {
  constructor() {
    super('Token inválido ou expirado');
  }
}

export class AccountDisabledError extends ForbiddenError {
  constructor() {
    super('Esta conta está desativada');
  }
}

export class EmailNotVerifiedError extends ForbiddenError {
  constructor() {
    super('Confirme seu e-mail antes de acessar a plataforma');
  }
}
