import { ApproverType } from 'generated/prisma/enums';
import { ApprovalRoutingService } from './approval-routing.service';
import {
  NoEligibleApproverError,
  NoMatchingRuleError,
  RoutingCycleError,
} from './routing.errors';
import { RoutingInput, RoutingMember, RoutingRule } from './routing.types';

const member = (
  id: string,
  limitCents: bigint,
  managerId: string | null = null,
  extra: Partial<RoutingMember> = {},
): RoutingMember => ({
  id,
  approvalLimitCents: limitCents,
  managerId,
  absentFrom: null,
  absentUntil: null,
  substituteId: null,
  ...extra,
});

const CFO = member('cfo', 50_000_000n, null);
const DIRETOR = member('diretor', 5_000_000n, 'cfo');
const GERENTE = member('gerente', 1_000_000n, 'diretor');
const ANALISTA = member('analista', 0n, 'gerente');
const ADMIN = member('admin-fin', 0n, null);

const HIERARCHY = [ANALISTA, GERENTE, DIRETOR, CFO];

const globalRule = (overrides: Partial<RoutingRule> = {}): RoutingRule => ({
  id: 'rule-global',
  costCenterId: null,
  categoryId: null,
  minAmountCents: 0n,
  maxAmountCents: null,
  approverType: ApproverType.COST_CENTER_MANAGER,
  requiresDualApproval: false,
  isActive: true,
  ...overrides,
});

const input = (overrides: Partial<RoutingInput> = {}): RoutingInput => ({
  amountCents: 500_000n,
  requester: ANALISTA,
  costCenter: { id: 'cc-1', managerId: 'gerente' },
  categoryId: null,
  hierarchy: HIERARCHY,
  rules: [globalRule()],
  dualApprovalThresholdCents: null,
  financeAdmins: [ADMIN],
  at: new Date('2026-03-10T12:00:00Z'),
  ...overrides,
});

describe('ApprovalRoutingService', () => {
  const service = new ApprovalRoutingService();
  const approvers = (result: { steps: { expectedApproverId: string }[] }) =>
    result.steps.map((step) => step.expectedApproverId);

  describe('5.2 — seleção de regra por especificidade', () => {
    it('RF35: regra do Centro de Custo vence a global no mesmo valor', () => {
      const specific = globalRule({
        id: 'rule-cc',
        costCenterId: 'cc-1',
        approverType: ApproverType.DIRECT_MANAGER,
      });

      const result = service.route(input({ rules: [globalRule(), specific] }));

      expect(result.ruleId).toBe('rule-cc');
    });

    it('RF35: CC + categoria vence apenas CC', () => {
      const byCostCenter = globalRule({ id: 'r-cc', costCenterId: 'cc-1' });
      const byBoth = globalRule({
        id: 'r-both',
        costCenterId: 'cc-1',
        categoryId: 'cat-1',
      });

      const result = service.route(
        input({ categoryId: 'cat-1', rules: [byCostCenter, byBoth] }),
      );

      expect(result.ruleId).toBe('r-both');
    });

    it('faixa sem teto cobre qualquer valor acima do piso', () => {
      const result = service.route(
        input({
          amountCents: 99_000_000n,
          rules: [globalRule({ minAmountCents: 0n, maxAmountCents: null })],
        }),
      );

      expect(result.ruleId).toBe('rule-global');
    });

    it('valor fora de todas as faixas lança erro explícito, não silêncio', () => {
      expect(() =>
        service.route(
          input({
            amountCents: 900n,
            rules: [globalRule({ minAmountCents: 1000n })],
          }),
        ),
      ).toThrow(NoMatchingRuleError);
    });

    it('regra inativa é ignorada na seleção', () => {
      expect(() =>
        service.route(input({ rules: [globalRule({ isActive: false })] })),
      ).toThrow(NoMatchingRuleError);
    });
  });

  describe('5.3 — RN23: ninguém aprova o próprio pedido', () => {
    it('solicitante comum segue a rota normal', () => {
      expect(approvers(service.route(input()))).toEqual(['gerente']);
    });

    it('RN23: solicitante é o gestor do CC → pula ele e sobe', () => {
      const result = service.route(
        input({ requester: GERENTE, amountCents: 500_000n }),
      );

      expect(approvers(result)).toEqual(['diretor']);
      expect(approvers(result)).not.toContain('gerente');
    });

    it('RN23: solicitante nunca aparece como aprovador em cascata longa', () => {
      const result = service.route(
        input({ requester: DIRETOR, amountCents: 30_000_000n }),
      );

      expect(approvers(result)).not.toContain('diretor');
    });

    it('RN23: solicitante sem superior cai no fallback da RN27', () => {
      const solo = member('solo', 90_000_000n, null);

      const result = service.route(
        input({
          requester: solo,
          costCenter: { id: 'cc-1', managerId: 'solo' },
          hierarchy: [solo],
        }),
      );

      expect(approvers(result)).toEqual(['admin-fin']);
    });
  });

  describe('5.4 — RN24: cascata hierárquica', () => {
    it('valor abaixo da alçada do gestor gera 1 etapa', () => {
      const result = service.route(input({ amountCents: 500_000n }));

      expect(result.steps).toHaveLength(1);
      expect(approvers(result)).toEqual(['gerente']);
    });

    it('RN24: transborda quando o valor excede a alçada do gestor', () => {
      const result = service.route(input({ amountCents: 3_000_000n }));

      expect(approvers(result)).toEqual(['gerente', 'diretor']);
    });

    it('RN24: sobe em cadeia até cobrir o valor integral (3 níveis)', () => {
      const result = service.route(input({ amountCents: 30_000_000n }));

      expect(approvers(result)).toEqual(['gerente', 'diretor', 'cfo']);
      expect(result.steps.map((s) => s.stepOrder)).toEqual([1, 2, 3]);
    });

    it('alçada é comparada com o valor integral, não com o saldo', () => {
      const result = service.route(input({ amountCents: 1_000_000n }));

      expect(approvers(result)).toEqual(['gerente']);
    });

    it('RN24: ciclo na hierarquia lança erro explícito, não laço infinito', () => {
      const a = member('a', 1n, 'b');
      const b = member('b', 1n, 'c');
      const c = member('c', 1n, 'a');

      const started = Date.now();

      expect(() =>
        service.route(
          input({
            amountCents: 9_000_000n,
            costCenter: { id: 'cc-1', managerId: 'a' },
            hierarchy: [a, b, c],
          }),
        ),
      ).toThrow(RoutingCycleError);

      expect(Date.now() - started).toBeLessThan(100);
    });
  });

  describe('5.5 — RN26: dupla aprovação', () => {
    it('RN26: valor acima do limiar marca requiresDualApproval', () => {
      const result = service.route(
        input({
          amountCents: 30_000_000n,
          dualApprovalThresholdCents: 10_000_000n,
        }),
      );

      expect(result.steps.every((step) => step.requiresDualApproval)).toBe(
        true,
      );
    });

    it('RN26: limiar nulo nunca exige dupla assinatura', () => {
      const result = service.route(
        input({ amountCents: 30_000_000n, dualApprovalThresholdCents: null }),
      );

      expect(result.steps.some((step) => step.requiresDualApproval)).toBe(
        false,
      );
    });

    it('valor exatamente no limiar já exige dupla', () => {
      const result = service.route(
        input({
          amountCents: 10_000_000n,
          dualApprovalThresholdCents: 10_000_000n,
        }),
      );

      expect(result.steps[0].requiresDualApproval).toBe(true);
    });

    it('RN22: requiresDualApproval vem da regra vigente', () => {
      const result = service.route(
        input({ rules: [globalRule({ requiresDualApproval: true })] }),
      );

      expect(result.steps[0].requiresDualApproval).toBe(true);
    });
  });

  describe('5.6 — RN27: fallback e RN29/RN30: substituto', () => {
    it('RN27: cadeia esgotada sem alçada suficiente vai ao Admin Financeiro', () => {
      const result = service.route(input({ amountCents: 90_000_000n }));

      expect(approvers(result)).toEqual([
        'gerente',
        'diretor',
        'cfo',
        'admin-fin',
      ]);
    });

    it('RN27: sem Admin Financeiro disponível lança erro explícito', () => {
      expect(() =>
        service.route(input({ amountCents: 90_000_000n, financeAdmins: [] })),
      ).toThrow(NoEligibleApproverError);
    });

    it('RN29: aprovador ausente na data → etapa vai ao substituto', () => {
      const ausente = member('gerente', 1_000_000n, 'diretor', {
        absentFrom: new Date('2026-03-01T00:00:00Z'),
        absentUntil: new Date('2026-03-20T00:00:00Z'),
        substituteId: 'carlos',
      });

      const result = service.route(
        input({ hierarchy: [ANALISTA, ausente, DIRETOR, CFO] }),
      );

      expect(result.steps[0].expectedApproverId).toBe('carlos');
      expect(result.steps[0].onBehalfOfId).toBe('gerente');
    });

    it('RN29: ausência é avaliada contra a data de submissão, não contra hoje', () => {
      const ausente = member('gerente', 1_000_000n, 'diretor', {
        absentFrom: new Date('2026-03-01T00:00:00Z'),
        absentUntil: new Date('2026-03-05T00:00:00Z'),
        substituteId: 'carlos',
      });

      const result = service.route(
        input({
          hierarchy: [ANALISTA, ausente, DIRETOR, CFO],
          at: new Date('2026-03-10T12:00:00Z'),
        }),
      );

      expect(result.steps[0].expectedApproverId).toBe('gerente');
      expect(result.steps[0].onBehalfOfId).toBeNull();
    });

    it('RN30: substituto do substituto nunca é acionado', () => {
      const ausente = member('gerente', 1_000_000n, 'diretor', {
        absentFrom: new Date('2026-03-01T00:00:00Z'),
        absentUntil: new Date('2026-03-20T00:00:00Z'),
        substituteId: 'carlos',
      });
      const carlosAusente = member('carlos', 0n, null, {
        absentFrom: new Date('2026-03-01T00:00:00Z'),
        absentUntil: new Date('2026-03-20T00:00:00Z'),
        substituteId: 'ana',
      });

      const result = service.route(
        input({
          hierarchy: [ANALISTA, ausente, DIRETOR, CFO, carlosAusente],
        }),
      );

      expect(result.steps[0].expectedApproverId).toBe('carlos');
      expect(approvers(result)).not.toContain('ana');
    });

    it('RN30: substituto que é o solicitante não recebe a etapa', () => {
      const ausente = member('gerente', 1_000_000n, 'diretor', {
        absentFrom: new Date('2026-03-01T00:00:00Z'),
        absentUntil: new Date('2026-03-20T00:00:00Z'),
        substituteId: 'analista',
      });

      const result = service.route(
        input({ hierarchy: [ANALISTA, ausente, DIRETOR, CFO] }),
      );

      expect(result.steps[0].expectedApproverId).toBe('gerente');
      expect(approvers(result)).not.toContain('analista');
    });
  });

  describe('5.1 — contrato do motor', () => {
    it('stepOrder é sequencial a partir de 1', () => {
      const result = service.route(input({ amountCents: 30_000_000n }));

      expect(result.steps.map((step) => step.stepOrder)).toEqual([1, 2, 3]);
    });

    it('DIRECT_MANAGER começa pelo líder do solicitante, não pelo gestor do CC', () => {
      const result = service.route(
        input({
          rules: [globalRule({ approverType: ApproverType.DIRECT_MANAGER })],
          costCenter: { id: 'cc-1', managerId: 'cfo' },
        }),
      );

      expect(result.steps[0].expectedApproverId).toBe('gerente');
    });

    it('é determinístico: mesma entrada, mesma rota', () => {
      const payload = input({ amountCents: 30_000_000n });

      expect(service.route(payload)).toEqual(service.route(payload));
    });
  });
});
