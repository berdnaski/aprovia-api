import {
  CompanyMemberRole,
  InvoiceStatus,
  PayableReleaseReason,
  PayableStatus,
} from 'generated/prisma/enums';
import { IAuditLogRepository } from 'src/modules/audit/domain/audit-logs.repository.interface';
import { FindInvoiceByIdUseCase } from 'src/modules/invoices/application/find-invoice-by-id.use-case';
import {
  PayableConferralPendingError,
  PayableNotBlockedError,
} from '../domain/matching.errors';
import { PayableEntity } from '../domain/payable.entity';
import { IPayableRepository } from '../domain/payables.repository.interface';
import { ReleasePayableUseCase } from './release-payable.use-case';

const actor = {
  memberId: 'member-1',
  userId: 'user-1',
  companyId: 'company-1',
  role: CompanyMemberRole.FINANCE_ADMIN,
};

const payableOf = (overrides: Partial<PayableEntity> = {}) =>
  ({
    id: 'payable-1',
    invoiceId: 'invoice-1',
    amountCents: 2100000n,
    status: PayableStatus.BLOCKED,
    ...overrides,
  }) as PayableEntity;

function build(payable: PayableEntity, invoiceStatus: InvoiceStatus) {
  const release = jest
    .fn()
    .mockResolvedValue({ ...payable, status: PayableStatus.RELEASED });
  const payableRepository = {
    findById: jest.fn().mockResolvedValue(payable),
    release,
  } as unknown as IPayableRepository;
  const findInvoiceByIdUseCase = {
    execute: jest.fn().mockResolvedValue({
      number: '48213',
      status: invoiceStatus,
    }),
  } as unknown as FindInvoiceByIdUseCase;
  const auditLogRepository = {
    record: jest.fn().mockResolvedValue(undefined),
  } as unknown as IAuditLogRepository;

  return {
    useCase: new ReleasePayableUseCase(
      payableRepository,
      findInvoiceByIdUseCase,
      auditLogRepository,
    ),
    release,
  };
}

describe('ReleasePayableUseCase', () => {
  it('libera a conta cuja nota passou na conferência', async () => {
    const { useCase, release } = build(payableOf(), InvoiceStatus.MATCHED);

    const result = await useCase.execute(
      'payable-1',
      actor,
      ' Conferido com o boleto ',
    );

    expect(result.status).toBe(PayableStatus.RELEASED);
    expect(release).toHaveBeenCalledWith('payable-1', {
      releaseReason: PayableReleaseReason.MATCHED,
      releasedById: 'member-1',
      proofStorageKey: null,
      releaseNote: 'Conferido com o boleto',
    });
  });

  it('não libera conta que já saiu da fila de liberação', async () => {
    const { useCase, release } = build(
      payableOf({ status: PayableStatus.PAID }),
      InvoiceStatus.MATCHED,
    );

    await expect(useCase.execute('payable-1', actor)).rejects.toBeInstanceOf(
      PayableNotBlockedError,
    );
    expect(release).not.toHaveBeenCalled();
  });

  it('não libera enquanto a conferência da nota não foi resolvida', async () => {
    const { useCase, release } = build(payableOf(), InvoiceStatus.DIVERGENT);

    await expect(useCase.execute('payable-1', actor)).rejects.toBeInstanceOf(
      PayableConferralPendingError,
    );
    expect(release).not.toHaveBeenCalled();
  });
});
