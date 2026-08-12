import { CompanyMemberRole } from 'generated/prisma/enums';
import {
  ITransactionManager,
  TransactionContext,
} from 'src/shared/domain/transaction.manager';
import {
  LastAdminError,
  MemberHasResponsibilitiesError,
} from '../domain/companies.errors';
import { CompanyMemberEntity } from '../domain/company-member.entity';
import { ICompanyMemberRepository } from '../domain/company-members.repository.interface';
import {
  IMemberResponsibilityGuard,
  MemberAction,
  ResponsibilityBlockerKind,
} from '../domain/member-responsibility-guard';
import { IAuditLogRepository } from 'src/modules/audit/domain/audit-logs.repository.interface';
import { MemberResponsibilityRegistry } from '../domain/services/member-responsibility.registry';
import { FindMemberByIdUseCase } from './find-member-by-id.use-case';
import { UpdateMemberRoleUseCase } from './update-member-role.use-case';

const memberOf = (role: CompanyMemberRole): CompanyMemberEntity => {
  const member = new CompanyMemberEntity();
  member.id = 'member-1';
  member.userId = 'user-1';
  member.companyId = 'company-1';
  member.role = role;
  member.disabledAt = null;
  return member;
};

const costCenterGuard = (managedCount: number): IMemberResponsibilityGuard => ({
  blocks: [MemberAction.DEACTIVATE, MemberAction.DEMOTE],
  check: () =>
    Promise.resolve(
      managedCount === 0
        ? null
        : {
            kind: ResponsibilityBlockerKind.COST_CENTER_MANAGER,
            message: `é gestor de ${managedCount} Centros de Custo`,
            items: Array.from({ length: managedCount }, (_, index) => ({
              id: `cc-${index}`,
              label: `CC ${index}`,
            })),
          },
    ),
});

const transactionManager: ITransactionManager = {
  run: <T>(work: (context: TransactionContext) => Promise<T>) =>
    work({ provider: 'prisma' }),
};

interface Harness {
  useCase: UpdateMemberRoleUseCase;
  updateRole: jest.Mock;
  checkGuards: jest.Mock;
  recordAudit: jest.Mock;
}

const build = (
  member: CompanyMemberEntity,
  guards: IMemberResponsibilityGuard[],
  activeAdminsLeft = 1,
): Harness => {
  const updateRole = jest.fn().mockResolvedValue(member);
  const checkGuards = jest.fn();
  const recordAudit = jest.fn().mockResolvedValue(undefined);
  const auditLogRepository = {
    record: recordAudit,
  } as unknown as IAuditLogRepository;

  const repository = {
    updateRole,
    lockActiveAdmins: jest.fn().mockResolvedValue(undefined),
    countActiveAdmins: jest.fn().mockResolvedValue(activeAdminsLeft),
  } as unknown as ICompanyMemberRepository;

  const finder = {
    execute: jest.fn().mockResolvedValue(member),
  } as unknown as FindMemberByIdUseCase;

  const registry = new MemberResponsibilityRegistry();

  guards.forEach((guard) => {
    registry.register({
      blocks: guard.blocks,
      check: (memberId, companyId, context) => {
        checkGuards();
        return guard.check(memberId, companyId, context);
      },
    });
  });

  return {
    updateRole,
    checkGuards,
    recordAudit,
    useCase: new UpdateMemberRoleUseCase(
      repository,
      finder,
      registry,
      auditLogRepository,
      transactionManager,
    ),
  };
};

describe('UpdateMemberRoleUseCase', () => {
  it('bloqueia rebaixar para Solicitante quem é gestor de Centro de Custo (RN14)', async () => {
    const { useCase, updateRole } = build(
      memberOf(CompanyMemberRole.APPROVER),
      [costCenterGuard(2)],
    );

    await expect(
      useCase.execute('member-1', 'company-1', CompanyMemberRole.REQUESTER),
    ).rejects.toBeInstanceOf(MemberHasResponsibilitiesError);

    expect(updateRole).not.toHaveBeenCalled();
  });

  it('permite rebaixar quem não tem responsabilidades', async () => {
    const { useCase, updateRole } = build(
      memberOf(CompanyMemberRole.APPROVER),
      [costCenterGuard(0)],
    );

    await useCase.execute('member-1', 'company-1', CompanyMemberRole.REQUESTER);

    expect(updateRole).toHaveBeenCalled();
  });

  it('promover Aprovador a Admin não consulta os guards', async () => {
    const { useCase, updateRole, checkGuards } = build(
      memberOf(CompanyMemberRole.APPROVER),
      [costCenterGuard(3)],
    );

    await useCase.execute(
      'member-1',
      'company-1',
      CompanyMemberRole.FINANCE_ADMIN,
    );

    expect(checkGuards).not.toHaveBeenCalled();
    expect(updateRole).toHaveBeenCalled();
  });

  it('bloqueia rebaixar o último Admin Financeiro (RN03)', async () => {
    const { useCase, updateRole } = build(
      memberOf(CompanyMemberRole.FINANCE_ADMIN),
      [],
      0,
    );

    await expect(
      useCase.execute('member-1', 'company-1', CompanyMemberRole.APPROVER),
    ).rejects.toBeInstanceOf(LastAdminError);

    expect(updateRole).not.toHaveBeenCalled();
  });

  it('permite rebaixar Admin quando ainda resta outro (RN03)', async () => {
    const { useCase, updateRole } = build(
      memberOf(CompanyMemberRole.FINANCE_ADMIN),
      [],
      1,
    );

    await useCase.execute('member-1', 'company-1', CompanyMemberRole.APPROVER);

    expect(updateRole).toHaveBeenCalled();
  });

  it('rebaixar Admin para Solicitante checa RN03 e RN14 juntos', async () => {
    const { useCase, updateRole, checkGuards } = build(
      memberOf(CompanyMemberRole.FINANCE_ADMIN),
      [costCenterGuard(1)],
      1,
    );

    await expect(
      useCase.execute('member-1', 'company-1', CompanyMemberRole.REQUESTER),
    ).rejects.toBeInstanceOf(MemberHasResponsibilitiesError);

    expect(checkGuards).toHaveBeenCalled();
    expect(updateRole).not.toHaveBeenCalled();
  });

  it('não faz nada quando a role não muda', async () => {
    const { useCase, updateRole } = build(
      memberOf(CompanyMemberRole.APPROVER),
      [],
    );

    await useCase.execute('member-1', 'company-1', CompanyMemberRole.APPROVER);

    expect(updateRole).not.toHaveBeenCalled();
  });

  it('grava MEMBER_CHANGED na trilha ao alterar a role (RF79)', async () => {
    const { useCase, recordAudit } = build(
      memberOf(CompanyMemberRole.APPROVER),
      [costCenterGuard(0)],
    );

    await useCase.execute('member-1', 'company-1', CompanyMemberRole.REQUESTER);

    expect(recordAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'MEMBER_CHANGED',
        entityId: 'member-1',
        oldData: { role: CompanyMemberRole.APPROVER },
        newData: { role: CompanyMemberRole.REQUESTER },
      }),
      expect.anything(),
    );
  });
});
