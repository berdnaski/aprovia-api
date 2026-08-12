import { RegistrationStatus, ValidationStatus } from 'generated/prisma/enums';
import { SupplierEntity } from '../supplier.entity';
import {
  canApproveWithSupplier,
  canSubmitWithSupplier,
  evaluateSupplier,
  SupplierUsage,
} from './supplier-eligibility.service';

const supplierOf = (
  registrationStatus: RegistrationStatus,
  validationStatus: ValidationStatus,
  blocked = false,
): SupplierEntity => {
  const supplier = new SupplierEntity();
  supplier.id = 'supplier-1';
  supplier.companyId = 'company-1';
  supplier.cnpj = '12345678000199';
  supplier.legalName = 'Acme LTDA';
  supplier.registrationStatus = registrationStatus;
  supplier.validationStatus = validationStatus;
  supplier.blocked = blocked;
  return supplier;
};

describe('SupplierEligibilityService', () => {
  it('libera fornecedor ativo e validado', () => {
    const result = evaluateSupplier(
      supplierOf(RegistrationStatus.ACTIVE, ValidationStatus.VALIDATED),
    );

    expect(result.usage).toBe(SupplierUsage.ALLOWED);
    expect(result.reason).toBeNull();
  });

  it.each([
    RegistrationStatus.CLOSED,
    RegistrationStatus.INACTIVE,
    RegistrationStatus.SUSPENDED,
    RegistrationStatus.VOID,
  ])('bloqueia submissão com situação %s (RN34)', (status) => {
    const supplier = supplierOf(status, ValidationStatus.VALIDATED);

    expect(evaluateSupplier(supplier).usage).toBe(
      SupplierUsage.BLOCKS_SUBMISSION,
    );
    expect(canSubmitWithSupplier(supplier)).toBe(false);
  });

  it('API indisponível permite criar mas bloqueia aprovação (RN35)', () => {
    const supplier = supplierOf(
      RegistrationStatus.UNKNOWN,
      ValidationStatus.FAILED,
    );

    expect(evaluateSupplier(supplier).usage).toBe(
      SupplierUsage.BLOCKS_APPROVAL,
    );
    expect(canSubmitWithSupplier(supplier)).toBe(true);
    expect(canApproveWithSupplier(supplier)).toBe(false);
  });

  it('pendente de validação também bloqueia apenas a aprovação (RN35)', () => {
    const supplier = supplierOf(
      RegistrationStatus.UNKNOWN,
      ValidationStatus.PENDING,
    );

    expect(canSubmitWithSupplier(supplier)).toBe(true);
    expect(canApproveWithSupplier(supplier)).toBe(false);
  });

  it('bloqueio comercial vence situação ativa na Receita (RF41)', () => {
    const supplier = supplierOf(
      RegistrationStatus.ACTIVE,
      ValidationStatus.VALIDATED,
      true,
    );

    expect(evaluateSupplier(supplier).usage).toBe(
      SupplierUsage.BLOCKS_SUBMISSION,
    );
    expect(evaluateSupplier(supplier).reason).toContain('bloqueado');
  });

  it('situação inapta vence a falta de validação na mensagem', () => {
    const supplier = supplierOf(
      RegistrationStatus.CLOSED,
      ValidationStatus.FAILED,
    );

    expect(evaluateSupplier(supplier).reason).toContain('baixada');
  });
});
