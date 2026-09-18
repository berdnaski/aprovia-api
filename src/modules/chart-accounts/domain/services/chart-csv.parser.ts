import { ChartAccountKind } from 'generated/prisma/enums';
import { ChartImportRow } from './chart-import.planner';

export interface ChartCsvResult {
  rows: ChartImportRow[];
  problems: string[];
}

const HEADER_ALIASES: Record<string, keyof Omit<ChartImportRow, 'line'>> = {
  codigo: 'code',
  code: 'code',
  conta: 'code',
  nome: 'name',
  name: 'name',
  descricao: 'name',
  natureza: 'kind',
  tipo: 'kind',
  kind: 'kind',
  analitica: 'postable',
  lancamento: 'postable',
  postable: 'postable',
  codigo_erp: 'externalCode',
  codigoerp: 'externalCode',
  erp: 'externalCode',
  reduzido: 'externalCode',
  external_code: 'externalCode',
};

const KIND_ALIASES: Record<string, ChartAccountKind> = {
  ativo: ChartAccountKind.ASSET,
  asset: ChartAccountKind.ASSET,
  passivo: ChartAccountKind.LIABILITY,
  liability: ChartAccountKind.LIABILITY,
  patrimonio: ChartAccountKind.EQUITY,
  patrimonio_liquido: ChartAccountKind.EQUITY,
  pl: ChartAccountKind.EQUITY,
  equity: ChartAccountKind.EQUITY,
  receita: ChartAccountKind.REVENUE,
  revenue: ChartAccountKind.REVENUE,
  custo: ChartAccountKind.COST,
  cost: ChartAccountKind.COST,
  despesa: ChartAccountKind.EXPENSE,
  expense: ChartAccountKind.EXPENSE,
};

const TRUE_VALUES = new Set(['s', 'sim', 'true', '1', 'a', 'analitica']);
const FALSE_VALUES = new Set(['n', 'nao', 'false', '0', 'sintetica']);

function simplify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
}

function detectSeparator(header: string): string {
  const candidates = [';', '\t', ','];
  return candidates.reduce((best, candidate) =>
    header.split(candidate).length > header.split(best).length
      ? candidate
      : best,
  );
}

function splitLine(line: string, separator: string): string[] {
  const cells: string[] = [];
  let current = '';
  let quoted = false;

  for (let index = 0; index < line.length; index++) {
    const char = line[index];

    if (char === '"') {
      if (quoted && line[index + 1] === '"') {
        current += '"';
        index++;
      } else {
        quoted = !quoted;
      }
    } else if (char === separator && !quoted) {
      cells.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  cells.push(current);
  return cells.map((cell) => cell.trim());
}

function parsePostable(value: string): boolean | null | undefined {
  const simple = simplify(value);

  if (!simple) {
    return null;
  }

  if (TRUE_VALUES.has(simple)) {
    return true;
  }

  if (FALSE_VALUES.has(simple)) {
    return false;
  }

  return undefined;
}

export function parseChartCsv(content: string): ChartCsvResult {
  const lines = content.replace(/^\uFEFF/, '').split(/\r?\n/);
  const headerIndex = lines.findIndex((line) => line.trim().length > 0);

  if (headerIndex === -1) {
    return { rows: [], problems: ['A planilha está vazia.'] };
  }

  const separator = detectSeparator(lines[headerIndex]);
  const columns = splitLine(lines[headerIndex], separator).map(
    (cell) => HEADER_ALIASES[simplify(cell)],
  );

  if (!columns.includes('code') || !columns.includes('name')) {
    return {
      rows: [],
      problems: [
        'A primeira linha precisa ter as colunas codigo e nome. As colunas natureza, analitica e codigo_erp são opcionais.',
      ],
    };
  }

  const rows: ChartImportRow[] = [];
  const problems: string[] = [];

  for (let index = headerIndex + 1; index < lines.length; index++) {
    if (!lines[index].trim()) {
      continue;
    }

    const line = index + 1;
    const cells = splitLine(lines[index], separator);
    const value = (field: keyof Omit<ChartImportRow, 'line'>) =>
      cells[columns.indexOf(field)] ?? '';

    const rawKind = columns.includes('kind') ? simplify(value('kind')) : '';
    const kind = rawKind ? KIND_ALIASES[rawKind] : null;

    if (kind === undefined) {
      problems.push(
        `Linha ${line}: natureza "${value('kind')}" desconhecida. Use ativo, passivo, patrimonio, receita, custo ou despesa.`,
      );
      continue;
    }

    const postable = columns.includes('postable')
      ? parsePostable(value('postable'))
      : null;

    if (postable === undefined) {
      problems.push(
        `Linha ${line}: na coluna analitica use S para contas que recebem lançamento e N para contas de agrupamento.`,
      );
      continue;
    }

    const externalCode = columns.includes('externalCode')
      ? value('externalCode') || null
      : null;

    rows.push({
      line,
      code: value('code'),
      name: value('name'),
      kind,
      postable,
      externalCode,
    });
  }

  if (rows.length === 0 && problems.length === 0) {
    problems.push('A planilha não tem nenhuma conta abaixo do cabeçalho.');
  }

  return { rows, problems };
}
