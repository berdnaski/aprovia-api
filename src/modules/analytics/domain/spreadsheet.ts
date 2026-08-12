export const ExportFormat = {
  CSV: 'csv',
  XLSX: 'xlsx',
} as const;

export type ExportFormat = (typeof ExportFormat)[keyof typeof ExportFormat];

export interface SpreadsheetColumn {
  header: string;
  width: number;
  money?: boolean;
}

export interface SpreadsheetCell {
  text: string;
  amount?: number;
}

export const EXPORT_COLUMNS: SpreadsheetColumn[] = [
  { header: 'Número', width: 18 },
  { header: 'Status', width: 20 },
  { header: 'Título', width: 40 },
  { header: 'Centro de Custo', width: 24 },
  { header: 'Categoria', width: 20 },
  { header: 'Fornecedor', width: 30 },
  { header: 'CNPJ', width: 20 },
  { header: 'Solicitante', width: 24 },
  { header: 'Valor (R$)', width: 16, money: true },
  { header: 'Criado em', width: 18 },
  { header: 'Enviado em', width: 18 },
  { header: 'Finalizado em', width: 18 },
];

const SEPARATOR = ';';
const BOM = '﻿';

export function toReais(cents: bigint): number {
  return Number(cents) / 100;
}

export function formatAmount(cents: bigint): string {
  const negative = cents < 0n;
  const absolute = negative ? -cents : cents;
  const units = absolute / 100n;
  const decimals = (absolute % 100n).toString().padStart(2, '0');

  return `${negative ? '-' : ''}${units},${decimals}`;
}

export function escapeCsv(value: string): string {
  if (!/[";\n\r]/.test(value)) {
    return value;
  }

  return `"${value.replace(/"/g, '""')}"`;
}

export function toCsv(
  columns: SpreadsheetColumn[],
  rows: SpreadsheetCell[][],
): string {
  const header = columns.map((column) => escapeCsv(column.header));
  const body = rows.map((row) => row.map((cell) => escapeCsv(cell.text)));

  return BOM + [header, ...body].map((row) => row.join(SEPARATOR)).join('\r\n');
}
