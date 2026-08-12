import {
  ConflictError,
  InvalidStateError,
  ValidationError,
} from 'src/shared/domain/errors/domain.error';
import { formatCnpj } from 'src/shared/domain/cnpj';

export class InvalidCnpjError extends ValidationError {
  constructor(cnpj: string) {
    super('CNPJ inválido: os dígitos verificadores não conferem', {
      cnpj,
    });
  }
}

export class SupplierCnpjTakenError extends ConflictError {
  constructor(cnpj: string) {
    super(`Já existe um fornecedor com o CNPJ ${formatCnpj(cnpj)}`, {
      cnpj,
    });
  }
}

export class SupplierNotSubmittableError extends InvalidStateError {
  constructor(cnpj: string, reason: string) {
    super(
      `Não é possível submeter um pedido para o fornecedor ${formatCnpj(cnpj)}: ${reason}`,
      { cnpj, reason },
    );
  }
}

export class SupplierNotApprovableError extends InvalidStateError {
  constructor(cnpj: string, reason: string) {
    super(
      `Não é possível aprovar um pedido do fornecedor ${formatCnpj(cnpj)}: ${reason}`,
      { cnpj, reason },
    );
  }
}
