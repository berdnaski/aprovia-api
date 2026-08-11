import { ApproverType } from 'generated/prisma/enums';
import { ApprovalRuleEntity } from '../approval-rule.entity';
import {
  ApprovalMatrixEmptyError,
  ApprovalMatrixGapError,
  ApprovalMatrixOpenRangeError,
  ApprovalMatrixOverlapError,
  ApprovalMatrixStartError,
  InvalidAmountRangeError,
  NoApprovalRuleError,
} from '../approval-rules.errors';
import { ApprovalRuleRangeData } from '../approval-rules.repository.interface';
import { ApprovalMatrixService } from './approval-matrix.service';

const range = (
  minAmountCents: bigint,
  maxAmountCents: bigint | null,
): ApprovalRuleRangeData => ({
  minAmountCents,
  maxAmountCents,
  approverType: ApproverType.DIRECT_MANAGER,
  requiresDualApproval: false,
});

const rule = (
  minAmountCents: bigint,
  maxAmountCents: bigint | null,
  costCenterId: string | null = null,
  categoryId: string | null = null,
): ApprovalRuleEntity => {
  const entity = new ApprovalRuleEntity();
  entity.id = `${costCenterId ?? 'g'}-${categoryId ?? 'g'}-${minAmountCents}`;
  entity.companyId = 'company';
  entity.costCenterId = costCenterId;
  entity.categoryId = categoryId;
  entity.minAmountCents = minAmountCents;
  entity.maxAmountCents = maxAmountCents;
  entity.approverType = ApproverType.DIRECT_MANAGER;
  entity.requiresDualApproval = false;
  entity.isActive = true;
  return entity;
};

describe('ApprovalMatrixService', () => {
  const service = new ApprovalMatrixService();

  describe('assertCoherent', () => {
    it('aceita faixas contíguas começando em zero e terminando sem teto', () => {
      const sorted = service.assertCoherent([
        range(101n, null),
        range(0n, 100n),
      ]);

      expect(sorted.map((item) => item.minAmountCents)).toEqual([0n, 101n]);
    });

    it('rejeita matriz vazia', () => {
      expect(() => service.assertCoherent([])).toThrow(
        ApprovalMatrixEmptyError,
      );
    });

    it('rejeita matriz que não começa em zero', () => {
      expect(() => service.assertCoherent([range(10n, null)])).toThrow(
        ApprovalMatrixStartError,
      );
    });

    it('rejeita buraco entre faixas', () => {
      expect(() =>
        service.assertCoherent([range(0n, 100n), range(150n, null)]),
      ).toThrow(ApprovalMatrixGapError);
    });

    it('rejeita sobreposição entre faixas', () => {
      expect(() =>
        service.assertCoherent([range(0n, 100n), range(50n, null)]),
      ).toThrow(ApprovalMatrixOverlapError);
    });

    it('rejeita matriz sem faixa final aberta', () => {
      expect(() =>
        service.assertCoherent([range(0n, 100n), range(101n, 200n)]),
      ).toThrow(ApprovalMatrixOpenRangeError);
    });

    it('rejeita faixa aberta fora da última posição', () => {
      expect(() =>
        service.assertCoherent([range(0n, null), range(101n, null)]),
      ).toThrow(ApprovalMatrixOpenRangeError);
    });

    it('rejeita faixa com teto menor ou igual ao piso', () => {
      expect(() => service.assertCoherent([range(100n, 100n)])).toThrow(
        InvalidAmountRangeError,
      );
    });
  });

  describe('resolve', () => {
    const global = [rule(0n, 100n), rule(101n, null)];

    it('usa a matriz global quando não há regra específica', () => {
      expect(service.resolve(global, 50n, 'cc1', null).id).toBe('g-g-0');
    });

    it('inclui o limite superior da faixa', () => {
      expect(service.resolve(global, 100n, null, null).id).toBe('g-g-0');
      expect(service.resolve(global, 101n, null, null).id).toBe('g-g-101');
    });

    it('prefere a regra do Centro de Custo sobre a global (RF35)', () => {
      const rules = [...global, rule(0n, null, 'cc1')];

      expect(service.resolve(rules, 50n, 'cc1', null).id).toBe('cc1-g-0');
    });

    it('prefere Centro de Custo + categoria sobre apenas Centro de Custo', () => {
      const rules = [
        ...global,
        rule(0n, null, 'cc1'),
        rule(0n, null, 'cc1', 'cat1'),
      ];

      expect(service.resolve(rules, 50n, 'cc1', 'cat1').id).toBe('cc1-cat1-0');
    });

    it('ignora regras inativas', () => {
      const inactive = rule(0n, null, 'cc1');
      inactive.isActive = false;

      expect(service.resolve([...global, inactive], 50n, 'cc1', null).id).toBe(
        'g-g-0',
      );
    });

    it('lança quando nenhuma faixa cobre o valor', () => {
      expect(() => service.resolve([rule(0n, 100n)], 500n, null, null)).toThrow(
        NoApprovalRuleError,
      );
    });
  });
});
