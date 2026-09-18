import { RegistrationStatus, ValidationStatus } from 'generated/prisma/enums';
import { RevalidateSupplierUseCase } from 'src/modules/suppliers/application/revalidate-supplier.use-case';
import { SupplierEntity } from 'src/modules/suppliers/domain/supplier.entity';
import { ISupplierRepository } from 'src/modules/suppliers/domain/suppliers.repository.interface';
import { RevalidateSuppliersUseCase } from './revalidate-suppliers.use-case';

const supplierOf = (
  id: string,
  registrationStatus: RegistrationStatus,
): SupplierEntity => {
  const supplier = new SupplierEntity();
  supplier.id = id;
  supplier.companyId = 'company-1';
  supplier.cnpj = '11222333000181';
  supplier.legalName = `Fornecedor ${id}`;
  supplier.registrationStatus = registrationStatus;
  supplier.validationStatus = ValidationStatus.VALIDATED;
  supplier.blocked = false;
  return supplier;
};

describe('RevalidateSuppliersUseCase', () => {
  const build = (
    stale: SupplierEntity[],
    refresh: jest.Mock,
  ): {
    useCase: RevalidateSuppliersUseCase;
    listStaleValidations: jest.Mock;
  } => {
    const listStaleValidations = jest.fn().mockResolvedValue(stale);

    const repository = {
      listStaleValidations,
    } as unknown as ISupplierRepository;
    const revalidate = { refresh } as unknown as RevalidateSupplierUseCase;

    return {
      useCase: new RevalidateSuppliersUseCase(repository, revalidate),
      listStaleValidations,
    };
  };

  it('busca apenas fornecedores sem revalidação nos últimos 30 dias', async () => {
    const { useCase, listStaleValidations } = build([], jest.fn());
    const now = new Date('2026-09-08T12:00:00.000Z');

    await useCase.execute(now);

    const [cutoff, limit] = listStaleValidations.mock.calls[0] as [
      Date,
      number,
    ];

    expect(cutoff.toISOString()).toBe('2026-08-09T12:00:00.000Z');
    expect(limit).toBeGreaterThan(0);
  });

  it('sinaliza quem deixou de estar apto na Receita', async () => {
    const apto = supplierOf('s1', RegistrationStatus.ACTIVE);
    const refresh = jest
      .fn()
      .mockResolvedValue(supplierOf('s1', RegistrationStatus.SUSPENDED));

    const { useCase } = build([apto], refresh);

    const summary = await useCase.execute();

    expect(summary).toEqual({ checked: 1, becameUnfit: 1, failed: 0 });
  });

  it('não conta como queda quem já estava inapto antes', async () => {
    const inapto = supplierOf('s2', RegistrationStatus.SUSPENDED);
    const refresh = jest
      .fn()
      .mockResolvedValue(supplierOf('s2', RegistrationStatus.SUSPENDED));

    const { useCase } = build([inapto], refresh);

    const summary = await useCase.execute();

    expect(summary).toEqual({ checked: 1, becameUnfit: 0, failed: 0 });
  });

  it('isola a falha de um CNPJ e segue para o próximo', async () => {
    const primeiro = supplierOf('s3', RegistrationStatus.ACTIVE);
    const segundo = supplierOf('s4', RegistrationStatus.ACTIVE);

    const refresh = jest
      .fn()
      .mockRejectedValueOnce(new Error('BrasilAPI fora do ar'))
      .mockResolvedValueOnce(supplierOf('s4', RegistrationStatus.ACTIVE));

    const { useCase } = build([primeiro, segundo], refresh);

    const summary = await useCase.execute();

    expect(refresh).toHaveBeenCalledTimes(2);
    expect(summary).toEqual({ checked: 1, becameUnfit: 0, failed: 1 });
  });
});
