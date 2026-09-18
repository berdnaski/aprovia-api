import { ChartAccountKind } from 'generated/prisma/enums';
import { ChartImportRow } from './services/chart-import.planner';

type ModelAccount = [code: string, name: string, kind: ChartAccountKind];

const { ASSET, COST, EXPENSE } = ChartAccountKind;

const MODEL_ACCOUNTS: ModelAccount[] = [
  ['1', 'Ativo', ASSET],
  ['1.2', 'Ativo não circulante', ASSET],
  ['1.2.3', 'Imobilizado', ASSET],
  ['1.2.3.01', 'Computadores e periféricos', ASSET],
  ['1.2.3.02', 'Móveis e utensílios', ASSET],
  ['1.2.3.03', 'Máquinas e equipamentos', ASSET],
  ['1.2.4', 'Intangível', ASSET],
  ['1.2.4.01', 'Softwares com licença perpétua', ASSET],
  ['3', 'Custos', COST],
  ['3.1', 'Custos operacionais', COST],
  ['3.1.01', 'Insumos e matéria-prima', COST],
  ['3.1.02', 'Fretes e logística', COST],
  ['3.1.03', 'Serviços terceirizados na operação', COST],
  ['4', 'Despesas', EXPENSE],
  ['4.1', 'Despesas administrativas', EXPENSE],
  ['4.1.01', 'Softwares e assinaturas', EXPENSE],
  ['4.1.02', 'Serviços de terceiros', EXPENSE],
  ['4.1.03', 'Material de escritório e consumo', EXPENSE],
  ['4.1.04', 'Viagens e hospedagem', EXPENSE],
  ['4.1.05', 'Manutenção e conservação', EXPENSE],
  ['4.1.06', 'Telefonia e internet', EXPENSE],
  ['4.1.07', 'Honorários contábeis e jurídicos', EXPENSE],
  ['4.1.08', 'Hospedagem e infraestrutura de TI', EXPENSE],
  ['4.2', 'Despesas comerciais', EXPENSE],
  ['4.2.01', 'Marketing e publicidade', EXPENSE],
  ['4.2.02', 'Eventos e brindes', EXPENSE],
];

export const MODEL_CHART_ROWS: ChartImportRow[] = MODEL_ACCOUNTS.map(
  ([code, name, kind], index) => ({
    line: index + 1,
    code,
    name,
    kind,
    postable: null,
    externalCode: null,
  }),
);

export const MODEL_CATEGORY_ACCOUNTS: Readonly<Record<string, string>> = {
  Software: '4.1.01',
  Serviços: '4.1.02',
  Materiais: '4.1.03',
  Equipamentos: '1.2.3.01',
  Viagens: '4.1.04',
  Marketing: '4.2.01',
  Infraestrutura: '4.1.08',
};
