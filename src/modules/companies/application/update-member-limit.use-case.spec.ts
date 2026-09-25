import { CompanyMemberRole } from 'generated/prisma/enums';
import { ValidationError } from 'src/shared/domain/errors/domain.error';
import { CompanyMemberEntity } from '../domain/company-member.entity';
import { ICompanyMemberRepository } from '../domain/company-members.repository.interface';
import { FindMemberByIdUseCase } from './find-member-by-id.use-case';
import { UpdateMemberLimitUseCase } from './update-member-limit.use-case';

function member(
  overrides: Partial<CompanyMemberEntity> = {},
): CompanyMemberEntity {
  return {
    id: 'member-1',
    userId: 'user-1',
    companyId: 'company-1',
    role: CompanyMemberRole.APPROVER,
    approvalLimitCents: 0n,
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

describe('UpdateMemberLimitUseCase', () => {
  function build(existing: CompanyMemberEntity) {
    const companyMemberRepository = {
      findById: jest.fn().mockResolvedValue(existing),
      updateApprovalLimit: jest
        .fn()
        .mockImplementation((_id: string, limitCents: bigint) => ({
          ...existing,
          approvalLimitCents: limitCents,
        })),
    } as unknown as ICompanyMemberRepository;

    const findMemberByIdUseCase = new FindMemberByIdUseCase(
      companyMemberRepository,
    );

    return new UpdateMemberLimitUseCase(
      companyMemberRepository,
      findMemberByIdUseCase,
    );
  }

  it('Aprovador tem a alçada aceita normalmente', async () => {
    const useCase = build(member({ role: CompanyMemberRole.APPROVER }));

    const updated = await useCase.execute('member-1', 'company-1', 500_00n);

    expect(updated.approvalLimitCents).toBe(500_00n);
  });

  it('Solicitante não pode ganhar alçada: não faz sentido decidir sem poder aprovar', async () => {
    const useCase = build(member({ role: CompanyMemberRole.REQUESTER }));

    await expect(
      useCase.execute('member-1', 'company-1', 500_00n),
    ).rejects.toThrow(ValidationError);
  });

  it('Admin Financeiro não tem alçada editável: já é sem teto', async () => {
    const useCase = build(member({ role: CompanyMemberRole.FINANCE_ADMIN }));

    await expect(
      useCase.execute('member-1', 'company-1', 500_00n),
    ).rejects.toThrow(ValidationError);
  });

  it('Contador não aprova nada, então não recebe alçada', async () => {
    const useCase = build(member({ role: CompanyMemberRole.ACCOUNTANT }));

    await expect(
      useCase.execute('member-1', 'company-1', 500_00n),
    ).rejects.toThrow(ValidationError);
  });

  it('alçada negativa é rejeitada mesmo para Aprovador', async () => {
    const useCase = build(member({ role: CompanyMemberRole.APPROVER }));

    await expect(useCase.execute('member-1', 'company-1', -1n)).rejects.toThrow(
      ValidationError,
    );
  });
});
