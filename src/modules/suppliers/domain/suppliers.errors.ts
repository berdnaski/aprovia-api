import {
  ConflictError,
  InvalidStateError,
  ValidationError,
} from 'src/shared/domain/errors/domain.error';
import { formatCnpj } from 'src/shared/domain/cnpj';

export class InvalidCnpjError extends ValidationError {
  constructor(cnpj: string) {
    super(
      'Este CNPJ não existe: os números não formam um CNPJ válido. Confira se digitou corretamente.',
      { cnpj },
    );
  }
}

export class SupplierCnpjTakenError extends ConflictError {
  constructor(cnpj: string) {
    super(
      `O CNPJ ${formatCnpj(cnpj)} já está cadastrado como fornecedor nesta empresa. Procure por ele na lista de fornecedores.`,
      { cnpj },
    );
  }
}

export class SupplierNotSubmittableError extends InvalidStateError {
  constructor(cnpj: string, reason: string) {
    super(
      `O pedido não pode ser enviado com o fornecedor ${formatCnpj(cnpj)} porque ${reason}.`,
      { cnpj, reason },
    );
  }
}

export class SupplierNotApprovableError extends InvalidStateError {
  constructor(cnpj: string, reason: string) {
    super(
      `O pedido não pode ser aprovado com o fornecedor ${formatCnpj(cnpj)} porque ${reason}.`,
      { cnpj, reason },
    );
  }
}
