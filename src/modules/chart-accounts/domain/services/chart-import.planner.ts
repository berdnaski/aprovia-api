import { ChartAccountKind } from 'generated/prisma/enums';
import { ChartAccountEntity } from '../chart-account.entity';
import {
  accountDepth,
  compareAccountCodes,
  isValidAccountCode,
  normalizeAccountCode,
  parentCodeOf,
} from '../chart-account-code';

export interface ChartImportRow {
  line: number;
  code: string;
  name: string;
  kind: ChartAccountKind | null;
  postable: boolean | null;
  externalCode: string | null;
}

export interface PlannedAccount {
  code: string;
  parentCode: string | null;
  name: string;
  kind: ChartAccountKind;
  postable: boolean;
  externalCode: string | null;
}

export interface PlannedUpdate {
  id: string;
  code: string;
  name: string;
  externalCode: string | null;
}

export interface ChartImportPlan {
  creates: PlannedAccount[];
  updates: PlannedUpdate[];
  problems: string[];
}

export function planChartImport(
  existing: ChartAccountEntity[],
  rows: ChartImportRow[],
): ChartImportPlan {
  const problems: string[] = [];
  const byCode = new Map(existing.map((account) => [account.code, account]));
  const incoming = new Map<string, ChartImportRow>();

  for (const row of rows) {
    const code = normalizeAccountCode(row.code);

    if (!isValidAccountCode(code)) {
      problems.push(`Linha ${row.line}: código "${row.code}" inválido.`);
      continue;
    }

    if (!row.name.trim()) {
      problems.push(`Linha ${row.line}: a conta ${code} está sem nome.`);
      continue;
    }

    if (incoming.has(code)) {
      problems.push(`Linha ${row.line}: o código ${code} aparece repetido.`);
      continue;
    }

    incoming.set(code, { ...row, code, name: row.name.trim() });
  }

  const parentCodes = new Set(
    [...incoming.keys()]
      .map(parentCodeOf)
      .filter((code): code is string => code !== null),
  );

  const resolvedKind = new Map<string, ChartAccountKind>();
  const ordered = [...incoming.values()].sort(
    (left, right) =>
      accountDepth(left.code) - accountDepth(right.code) ||
      compareAccountCodes(left.code, right.code),
  );

  const creates: PlannedAccount[] = [];
  const updates: PlannedUpdate[] = [];

  for (const row of ordered) {
    const parentCode = parentCodeOf(row.code);
    const current = byCode.get(row.code);

    if (current) {
      if (row.kind && row.kind !== current.kind) {
        problems.push(
          `Linha ${row.line}: a conta ${row.code} já existe com outra natureza.`,
        );
        continue;
      }

      resolvedKind.set(row.code, current.kind);
      updates.push({
        id: current.id,
        code: row.code,
        name: row.name,
        externalCode: row.externalCode ?? current.externalCode,
      });
      continue;
    }

    const existingParent = parentCode ? byCode.get(parentCode) : undefined;
    const parentKind = parentCode ? resolvedKind.get(parentCode) : undefined;

    if (parentCode && !existingParent && !incoming.has(parentCode)) {
      problems.push(
        `Linha ${row.line}: a conta superior ${parentCode} de ${row.code} não existe.`,
      );
      continue;
    }

    if (existingParent?.postable) {
      problems.push(
        `Linha ${row.line}: a conta ${parentCode} recebe lançamentos e não pode ter contas abaixo dela.`,
      );
      continue;
    }

    const incomingParent = parentCode ? incoming.get(parentCode) : undefined;

    if (incomingParent?.postable === true) {
      problems.push(
        `Linha ${incomingParent.line}: a conta ${parentCode} está marcada como analítica, mas tem contas abaixo dela.`,
      );
      continue;
    }

    const kind = row.kind ?? parentKind ?? null;

    if (!kind) {
      problems.push(
        `Linha ${row.line}: informe a natureza da conta ${row.code}.`,
      );
      continue;
    }

    if (parentKind && parentKind !== kind) {
      problems.push(
        `Linha ${row.line}: a conta ${row.code} tem natureza diferente da conta superior.`,
      );
      continue;
    }

    resolvedKind.set(row.code, kind);
    creates.push({
      code: row.code,
      parentCode,
      name: row.name,
      kind,
      postable: row.postable ?? !parentCodes.has(row.code),
      externalCode: row.externalCode,
    });
  }

  return { creates, updates, problems };
}
