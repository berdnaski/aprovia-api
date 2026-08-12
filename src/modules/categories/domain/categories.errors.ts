import {
  ConflictError,
  ValidationError,
} from 'src/shared/domain/errors/domain.error';

export class CategoryNameTakenError extends ConflictError {
  constructor(name: string) {
    super(`Já existe uma categoria chamada "${name}" nesta empresa`, { name });
  }
}

export class InactiveCategoryError extends ValidationError {
  constructor() {
    super('Esta categoria está inativa e não aceita novos pedidos');
  }
}
