import { CompanyMemberRole } from 'generated/prisma/enums';
import { NotFoundError } from 'src/shared/domain/errors/domain.error';
import { CostCenterEntity } from 'src/modules/cost-centers/domain/cost-center.entity';
import { ICostCenterRepository } from 'src/modules/cost-centers/domain/cost-centers.repository.interface';
import { FindCostCenterByIdUseCase } from 'src/modules/cost-centers/application/find-cost-center-by-id.use-case';
import { CompanyMemberEntity } from '../domain/company-member.entity';
import { ICompanyMemberRepository } from '../domain/company-members.repository.interface';
import { FindMemberByIdUseCase } from './find-member-by-id.use-case';
import { SetMemberDefaultCostCenterUseCase } from './set-member-default-cost-center.use-case';

function member(
  overrides: Partial<CompanyMemberEntity> = {},
): CompanyMemberEntity {
  return {
    id: 'member-1',
    userId: 'user-1',
    companyId: 'company-1',
    role: CompanyMemberRole.APPROVER,
    approvalLimitCents: 500_00n,
    defaultCostCenterId: null,
    managerId: null,
    absentFrom: null,
    absentUntil: null,
    substituteId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    disabledAt: null,
    ...overrides,
  };
}

function costCenter(
  overrides: Partial<CostCenterEntity> = {},
): CostCenterEntity {
  return {
    id: 'cost-center-1',
    companyId: 'company-1',
    name: 'Tecnologia',
    code: null,
    managerId: 'member-1',
    parentId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    disabledAt: null,
    ...overrides,
  };
}

describe('SetMemberDefaultCostCenterUseCase', () => {
  function build(
    existingMember: CompanyMemberEntity,
    existingCostCenter: CostCenterEntity | null = costCenter(),
  ) {
    const companyMemberRepository = {
      findById: jest.fn().mockResolvedValue(existingMember),
      updateDefaultCostCenter: jest
        .fn()
        .mockImplementation((_id: string, costCenterId: string | null) => ({
          ...existingMember,
          defaultCostCenterId: costCenterId,
        })),
    } as unknown as ICompanyMemberRepository;

    const costCenterRepository = {
      findById: jest.fn().mockResolvedValue(existingCostCenter),
    } as unknown as ICostCenterRepository;

    return new SetMemberDefaultCostCenterUseCase(
      companyMemberRepository,
      new FindMemberByIdUseCase(companyMemberRepository),
      new FindCostCenterByIdUseCase(costCenterRepository),
    );
  }

  it('define o Centro de Custo preferido de um Aprovador', async () => {
    const useCase = build(member());

    const updated = await useCase.execute(
      'member-1',
      'company-1',
      'cost-center-1',
    );

    expect(updated.defaultCostCenterId).toBe('cost-center-1');
  });

  it('nulo remove a preferência', async () => {
    const useCase = build(member({ defaultCostCenterId: 'cost-center-1' }));

    const updated = await useCase.execute('member-1', 'company-1', null);

    expect(updated.defaultCostCenterId).toBeNull();
  });

  it('Centro de Custo de outra empresa (ou inexistente) é rejeitado', async () => {
    const useCase = build(member(), null);

    await expect(
      useCase.execute('member-1', 'company-1', 'cost-center-1'),
    ).rejects.toThrow(NotFoundError);
  });
});
