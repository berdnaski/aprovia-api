import { RegistrationStatus, ValidationStatus } from 'generated/prisma/enums';
import { SupplierEntity } from '../supplier.entity';

export const SupplierUsage = {
  ALLOWED: 'ALLOWED',
  BLOCKS_SUBMISSION: 'BLOCKS_SUBMISSION',
  BLOCKS_APPROVAL: 'BLOCKS_APPROVAL',
} as const;

export type SupplierUsage = (typeof SupplierUsage)[keyof typeof SupplierUsage];

export interface SupplierEligibility {
  usage: SupplierUsage;
  reason: string | null;
}

const UNFIT_STATUSES: readonly RegistrationStatus[] = [
  RegistrationStatus.CLOSED,
  RegistrationStatus.INACTIVE,
  RegistrationStatus.SUSPENDED,
  RegistrationStatus.VOID,
];

const STATUS_LABELS: Record<RegistrationStatus, string> = {
  ACTIVE: 'ativa',
  CLOSED: 'baixada',
  INACTIVE: 'inapta',
  SUSPENDED: 'suspensa',
  VOID: 'nula',
  UNKNOWN: 'não verificada',
};

export function evaluateSupplier(
  supplier: SupplierEntity,
): SupplierEligibility {
  if (supplier.blocked) {
    return {
      usage: SupplierUsage.BLOCKS_SUBMISSION,
      reason: 'Fornecedor bloqueado pela organização',
    };
  }

  if (UNFIT_STATUSES.includes(supplier.registrationStatus)) {
    return {
      usage: SupplierUsage.BLOCKS_SUBMISSION,
      reason: `Situação cadastral na Receita Federal: ${STATUS_LABELS[supplier.registrationStatus]}`,
    };
  }

  if (supplier.validationStatus !== ValidationStatus.VALIDATED) {
    return {
      usage: SupplierUsage.BLOCKS_APPROVAL,
      reason:
        'Fornecedor pendente de validação do CNPJ na Receita Federal. O pedido pode ser criado, mas precisa da validação antes da aprovação final',
    };
  }

  return { usage: SupplierUsage.ALLOWED, reason: null };
}

export function canSubmitWithSupplier(supplier: SupplierEntity): boolean {
  return evaluateSupplier(supplier).usage !== SupplierUsage.BLOCKS_SUBMISSION;
}

export function canApproveWithSupplier(supplier: SupplierEntity): boolean {
  return evaluateSupplier(supplier).usage === SupplierUsage.ALLOWED;
}
