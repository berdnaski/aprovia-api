export type DomainErrorKind =
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'FORBIDDEN'
  | 'INVALID_STATE'
  | 'VALIDATION';

export abstract class DomainError extends Error {
  abstract readonly kind: DomainErrorKind;

  constructor(
    message: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class NotFoundError extends DomainError {
  readonly kind = 'NOT_FOUND' as const;

  constructor(resource: string, identifier?: string) {
    super(
      identifier
        ? `${resource} não encontrado: ${identifier}`
        : `${resource} não encontrado`,
    );
  }
}

export class ConflictError extends DomainError {
  readonly kind = 'CONFLICT' as const;
}

export class ForbiddenError extends DomainError {
  readonly kind = 'FORBIDDEN' as const;
}

export class InvalidStateError extends DomainError {
  readonly kind = 'INVALID_STATE' as const;
}

export class ValidationError extends DomainError {
  readonly kind = 'VALIDATION' as const;
}
