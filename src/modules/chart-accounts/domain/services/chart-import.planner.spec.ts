import { ChartAccountKind } from 'generated/prisma/enums';
import { ChartAccountEntity } from '../chart-account.entity';
import { ChartImportRow, planChartImport } from './chart-import.planner';

const row = (
  line: number,
  code: string,
  name: string,
  overrides: Partial<ChartImportRow> = {},
): ChartImportRow => ({
  line,
  code,
  name,
  kind: null,
  postable: null,
  externalCode: null,
  ...overrides,
});

const existingAccount = (overrides: Partial<ChartAccountEntity>) =>
  ({
    id: 'account-4',
    code: '4',
    name: 'Despesas',
    kind: ChartAccountKind.EXPENSE,
    postable: false,
    externalCode: null,
    ...overrides,
  }) as ChartAccountEntity;

describe('planChartImport', () => {
  it('cria pais antes dos filhos e herda a natureza da conta superior', () => {
    const plan = planChartImport(
      [],
      [
        row(1, '4.1.01', 'Softwares'),
        row(2, '4', 'Despesas', { kind: ChartAccountKind.EXPENSE }),
        row(3, '4.1', 'Administrativas'),
      ],
    );

    expect(plan.problems).toEqual([]);
    expect(plan.creates.map((account) => account.code)).toEqual([
      '4',
      '4.1',
      '4.1.01',
    ]);
    expect(plan.creates.map((account) => account.postable)).toEqual([
      false,
      false,
      true,
    ]);
    expect(
      plan.creates.every(
        (account) => account.kind === ChartAccountKind.EXPENSE,
      ),
    ).toBe(true);
  });

  it('atualiza nome e código do ERP de contas que já existem', () => {
    const plan = planChartImport(
      [existingAccount({})],
      [
        row(1, '4', 'Despesas gerais', { externalCode: '3' }),
        row(2, '4.2', 'Comerciais'),
      ],
    );

    expect(plan.updates).toEqual([
      {
        id: 'account-4',
        code: '4',
        name: 'Despesas gerais',
        externalCode: '3',
      },
    ]);
    expect(plan.creates[0]).toMatchObject({
      code: '4.2',
      parentCode: '4',
      kind: ChartAccountKind.EXPENSE,
    });
  });

  it('recusa conta cuja conta superior não existe', () => {
    const plan = planChartImport(
      [],
      [row(1, '4.1.01', 'Softwares', { kind: ChartAccountKind.EXPENSE })],
    );

    expect(plan.problems).toHaveLength(1);
    expect(plan.creates).toEqual([]);
  });

  it('recusa filho debaixo de conta analítica já cadastrada', () => {
    const plan = planChartImport(
      [existingAccount({ code: '4.1.01', postable: true })],
      [row(1, '4.1.01.1', 'Licenças')],
    );

    expect(plan.problems[0]).toContain('4.1.01');
  });

  it('recusa conta de primeiro nível sem natureza e códigos repetidos', () => {
    const plan = planChartImport(
      [],
      [
        row(1, '9', 'Outros'),
        row(2, '1', 'Ativo', { kind: ChartAccountKind.ASSET }),
        row(3, '1', 'Ativo de novo', { kind: ChartAccountKind.ASSET }),
      ],
    );

    expect(plan.problems).toHaveLength(2);
  });
});
