import {
  ForbiddenError,
  ValidationError,
} from 'src/shared/domain/errors/domain.error';

export class InvalidCredentialsError extends ValidationError {
  constructor() {
    super('E-mail ou senha incorretos. Confira os dados e tente novamente.');
  }
}

export class InvalidTokenError extends ValidationError {
  constructor() {
    super(
      'Este link não é mais válido: ele expirou ou já foi usado. Solicite um novo.',
    );
  }
}

export class AccountDisabledError extends ForbiddenError {
  constructor() {
    super(
      'Esta conta foi desativada. Fale com o Admin Financeiro da sua empresa para reativá-la.',
    );
  }
}

export class EmailNotVerifiedError extends ForbiddenError {
  constructor() {
    super(
      'Confirme seu e-mail para entrar. Verifique sua caixa de entrada ou solicite um novo link de confirmação.',
    );
  }
}
