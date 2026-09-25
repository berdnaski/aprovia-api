import { CompanyMemberRole } from 'generated/prisma/enums';
import { ApprovalRoutingService } from './approval-routing.service';
import {
  NoEligibleApproverError,
  NoMatchingRuleError,
  NoSecondApproverError,
} from './routing.errors';
import { RoutingInput, RoutingMember, RoutingRule } from './routing.types';

const CC = 'cc-tecnologia';
const OUTRO_CC = 'cc-marketing';

function member(
  id: string,
  overrides: Partial<RoutingMember> = {},
): RoutingMember {
  return {
    id,
    role: CompanyMemberRole.APPROVER,
    approvalLimitCents: 0n,
    costCenterId: CC,
    absentFrom: null,
    absentUntil: null,
    substituteId: null,
    disabled: false,
    ...overrides,
  };
}

function rule(overrides: Partial<RoutingRule> = {}): RoutingRule {
  return {
    id: 'faixa-global',
    costCenterId: null,
    categoryId: null,
    minAmountCents: 0n,
    maxAmountCents: null,
    requiresDualApproval: false,
    isActive: true,
    ...overrides,
  };
}

function input(overrides: Partial<RoutingInput> = {}): RoutingInput {
  return {
    amountCents: 100_000n,
    requester: member('pedro', { role: CompanyMemberRole.REQUESTER }),
    costCenter: { id: CC },
    categoryId: null,
    members: [],
    rules: [rule()],
    dualApprovalThresholdCents: null,
    at: new Date('2026-09-24T12:00:00Z'),
    ...overrides,
  };
}

describe('ApprovalRoutingService', () => {
  const routing = new ApprovalRoutingService();

  describe('seleção da faixa', () => {
    it('faixa do centro de custo vence a global no mesmo valor', () => {
      const result = routing.route(
        input({
          members: [member('erick', { approvalLimitCents: 500_000n })],
          rules: [
            rule({ id: 'global' }),
            rule({ id: 'do-centro', costCenterId: CC }),
          ],
        }),
      );

      expect(result.ruleId).toBe('do-centro');
    });

    it('centro mais categoria vence só centro', () => {
      const result = routing.route(
        input({
          categoryId: 'software',
          members: [member('erick', { approvalLimitCents: 500_000n })],
          rules: [
            rule({ id: 'do-centro', costCenterId: CC }),
            rule({
              id: 'centro-e-categoria',
              costCenterId: CC,
              categoryId: 'software',
            }),
          ],
        }),
      );

      expect(result.ruleId).toBe('centro-e-categoria');
    });

    it('valor fora de todas as faixas para o pedido com erro claro', () => {
      expect(() =>
        routing.route(
          input({
            amountCents: 900_000n,
            members: [member('erick', { approvalLimitCents: 900_000n })],
            rules: [rule({ maxAmountCents: 100_000n })],
          }),
        ),
      ).toThrow(NoMatchingRuleError);
    });

    it('faixa inativa é ignorada', () => {
      const result = routing.route(
        input({
          members: [member('erick', { approvalLimitCents: 500_000n })],
          rules: [
            rule({ id: 'desligada', costCenterId: CC, isActive: false }),
            rule({ id: 'global' }),
          ],
        }),
      );

      expect(result.ruleId).toBe('global');
    });
  });

  describe('quem aprova sai da alçada, não do organograma', () => {
    it('escolhe a menor alçada que cobre o valor', () => {
      const result = routing.route(
        input({
          amountCents: 100_000n,
          members: [
            member('folgado', { approvalLimitCents: 900_000n }),
            member('justo', { approvalLimitCents: 150_000n }),
            member('curto', { approvalLimitCents: 50_000n }),
          ],
        }),
      );

      expect(result.steps).toHaveLength(1);
      expect(result.steps[0].expectedApproverId).toBe('justo');
    });

    it('acima da alçada de todos, cai no Admin Financeiro', () => {
      const result = routing.route(
        input({
          amountCents: 650_000n,
          members: [
            member('aprovador', { approvalLimitCents: 100_000n }),
            member('leonardo', { role: CompanyMemberRole.FINANCE_ADMIN }),
          ],
        }),
      );

      expect(result.steps[0].expectedApproverId).toBe('leonardo');
    });

    it('Admin Financeiro não tem teto, mesmo com limite zerado no cadastro', () => {
      const result = routing.route(
        input({
          amountCents: 10_000_000n,
          members: [
            member('leonardo', {
              role: CompanyMemberRole.FINANCE_ADMIN,
              approvalLimitCents: 0n,
            }),
          ],
        }),
      );

      expect(result.steps[0].expectedApproverId).toBe('leonardo');
    });

    it('prefere quem responde pelo centro de custo do pedido', () => {
      const result = routing.route(
        input({
          members: [
            member('de-fora', {
              approvalLimitCents: 150_000n,
              costCenterId: OUTRO_CC,
            }),
            member('do-centro', {
              approvalLimitCents: 150_000n,
              costCenterId: CC,
            }),
          ],
        }),
      );

      expect(result.steps[0].expectedApproverId).toBe('do-centro');
    });

    it('ninguém aprova o próprio pedido', () => {
      const result = routing.route(
        input({
          requester: member('erick', { approvalLimitCents: 900_000n }),
          members: [
            member('erick', { approvalLimitCents: 900_000n }),
            member('rita', { approvalLimitCents: 900_000n }),
          ],
        }),
      );

      expect(result.steps[0].expectedApproverId).toBe('rita');
    });

    it('Admin Financeiro que pede sozinho recebe erro explicativo, não silêncio', () => {
      const leonardo = member('leonardo', {
        role: CompanyMemberRole.FINANCE_ADMIN,
      });

      expect(() =>
        routing.route(input({ requester: leonardo, members: [leonardo] })),
      ).toThrow(NoEligibleApproverError);
    });

    it('membro desativado não entra na rota', () => {
      expect(() =>
        routing.route(
          input({
            members: [
              member('afastado', {
                approvalLimitCents: 900_000n,
                disabled: true,
              }),
            ],
          }),
        ),
      ).toThrow(NoEligibleApproverError);
    });

    it('Solicitante nunca é escolhido como aprovador', () => {
      expect(() =>
        routing.route(
          input({
            members: [
              member('outro-solicitante', {
                role: CompanyMemberRole.REQUESTER,
                approvalLimitCents: 900_000n,
              }),
            ],
          }),
        ),
      ).toThrow(NoEligibleApproverError);
    });
  });

  describe('duas assinaturas viram duas etapas', () => {
    it('faixa com dupla assinatura gera duas etapas, com pessoas diferentes', () => {
      const result = routing.route(
        input({
          members: [
            member('aprovador', { approvalLimitCents: 900_000n }),
            member('leonardo', { role: CompanyMemberRole.FINANCE_ADMIN }),
          ],
          rules: [rule({ requiresDualApproval: true })],
        }),
      );

      expect(result.steps).toHaveLength(2);
      expect(result.steps[0].expectedApproverId).toBe('aprovador');
      expect(result.steps[1].expectedApproverId).toBe('leonardo');
      expect(result.steps.map((step) => step.stepOrder)).toEqual([1, 2]);
    });

    it('cada etapa fecha com uma assinatura, para não travar o pedido', () => {
      const result = routing.route(
        input({
          members: [
            member('aprovador', { approvalLimitCents: 900_000n }),
            member('leonardo', { role: CompanyMemberRole.FINANCE_ADMIN }),
          ],
          rules: [rule({ requiresDualApproval: true })],
        }),
      );

      expect(result.steps.every((step) => !step.requiresDualApproval)).toBe(
        true,
      );
    });

    it('limiar da empresa também exige a segunda assinatura', () => {
      const result = routing.route(
        input({
          amountCents: 100_000n,
          dualApprovalThresholdCents: 100_000n,
          members: [
            member('aprovador', { approvalLimitCents: 900_000n }),
            member('leonardo', { role: CompanyMemberRole.FINANCE_ADMIN }),
          ],
        }),
      );

      expect(result.steps).toHaveLength(2);
    });

    it('sem limiar, uma assinatura basta', () => {
      const result = routing.route(
        input({
          dualApprovalThresholdCents: null,
          members: [
            member('aprovador', { approvalLimitCents: 900_000n }),
            member('leonardo', { role: CompanyMemberRole.FINANCE_ADMIN }),
          ],
        }),
      );

      expect(result.steps).toHaveLength(1);
    });

    it('sem uma segunda pessoa elegível, avisa em vez de deixar o pedido preso', () => {
      expect(() =>
        routing.route(
          input({
            members: [member('unico', { approvalLimitCents: 900_000n })],
            rules: [rule({ requiresDualApproval: true })],
          }),
        ),
      ).toThrow(NoSecondApproverError);
    });
  });

  describe('ausência e substituto', () => {
    it('aprovador ausente na data manda a etapa para o substituto, em seu nome', () => {
      const result = routing.route(
        input({
          at: new Date('2026-09-24T12:00:00Z'),
          members: [
            member('titular', {
              approvalLimitCents: 900_000n,
              absentFrom: new Date('2026-09-20T00:00:00Z'),
              absentUntil: new Date('2026-09-30T00:00:00Z'),
              substituteId: 'substituto',
            }),
            member('substituto', { approvalLimitCents: 0n }),
          ],
        }),
      );

      expect(result.steps[0].expectedApproverId).toBe('substituto');
      expect(result.steps[0].onBehalfOfId).toBe('titular');
    });

    it('fora do período de ausência, a etapa fica com o titular', () => {
      const result = routing.route(
        input({
          at: new Date('2026-10-15T12:00:00Z'),
          members: [
            member('titular', {
              approvalLimitCents: 900_000n,
              absentFrom: new Date('2026-09-20T00:00:00Z'),
              absentUntil: new Date('2026-09-30T00:00:00Z'),
              substituteId: 'substituto',
            }),
            member('substituto', { approvalLimitCents: 0n }),
          ],
        }),
      );

      expect(result.steps[0].expectedApproverId).toBe('titular');
      expect(result.steps[0].onBehalfOfId).toBeNull();
    });

    it('substituto que é quem pediu não recebe a etapa', () => {
      const result = routing.route(
        input({
          requester: member('pedro', { role: CompanyMemberRole.REQUESTER }),
          members: [
            member('titular', {
              approvalLimitCents: 900_000n,
              absentFrom: new Date('2026-09-20T00:00:00Z'),
              absentUntil: new Date('2026-09-30T00:00:00Z'),
              substituteId: 'pedro',
            }),
          ],
        }),
      );

      expect(result.steps[0].expectedApproverId).toBe('titular');
    });
  });

  describe('contrato do motor', () => {
    it('a rota é determinística: mesma entrada, mesma saída', () => {
      const entrada = input({
        members: [
          member('a', { approvalLimitCents: 150_000n }),
          member('b', { approvalLimitCents: 150_000n }),
        ],
      });

      expect(routing.route(entrada)).toEqual(routing.route(entrada));
    });
  });
});
