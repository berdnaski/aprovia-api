import { Injectable } from '@nestjs/common';
import { WithholdingKind } from 'generated/prisma/enums';
import {
  escapeCsv,
  formatAmount,
} from 'src/modules/analytics/domain/spreadsheet';
import { ValidationError } from 'src/shared/domain/errors/domain.error';
import {
  IPayableExportRepository,
  PayableExportRow,
} from '../domain/payable-export.repository.interface';
import { ExportPayablesQueryDto } from '../dto/export-payables-query.dto';

export const EXPORT_PAYABLE_ROW_LIMIT = 20000;

export interface ExportedPayablesFile {
  filename: string;
  contentType: string;
  content: Buffer;
}

const WITHHOLDING_COLUMNS: { kind: string; header: string }[] = [
  { kind: WithholdingKind.IRRF, header: 'IRRF (R$)' },
  { kind: WithholdingKind.INSS, header: 'INSS (R$)' },
  { kind: WithholdingKind.PIS, header: 'PIS (R$)' },
  { kind: WithholdingKind.COFINS, header: 'COFINS (R$)' },
  { kind: WithholdingKind.CSLL, header: 'CSLL (R$)' },
  { kind: WithholdingKind.ISS_RETIDO, header: 'ISS retido (R$)' },
];

const HEADER = [
  'Fornecedor',
  'CNPJ',
  'Documento',
  'Vencimento',
  'Data do pagamento',
  'Centro de custo',
  'Código centro de custo',
  'Conta contábil',
  'Nome da conta',
  'Valor bruto (R$)',
  ...WITHHOLDING_COLUMNS.map((column) => column.header),
  'Valor líquido pago (R$)',
  'Valor desta linha de rateio (R$)',
];

function formatDate(
  value: Date | null,
  timeZone = 'America/Sao_Paulo',
): string {
  if (!value) {
    return '';
  }

  return new Intl.DateTimeFormat('pt-BR', {
    timeZone,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(value);
}

// due_date é uma coluna DATE: chega como meia-noite UTC e voltaria um dia se
// formatada no fuso de São Paulo.
function formatDateOnly(value: Date | null): string {
  return formatDate(value, 'UTC');
}

function withholdingAmount(row: PayableExportRow, kind: string): string {
  const total = row.withholdings
    .filter((item) => item.kind === kind)
    .reduce((sum, item) => sum + item.amountCents, 0n);

  return formatAmount(total);
}

function toLine(row: PayableExportRow): string {
  const cells = [
    row.supplierName,
    row.supplierCnpj,
    row.documentNumber ?? '',
    formatDateOnly(row.dueDate),
    formatDate(row.paidAt),
    row.costCenterName,
    row.costCenterCode ?? '',
    row.chartAccountCode ?? '',
    row.chartAccountName ?? '',
    formatAmount(row.grossAmountCents),
    ...WITHHOLDING_COLUMNS.map((column) => withholdingAmount(row, column.kind)),
    formatAmount(row.netAmountCents),
    formatAmount(row.allocationAmountCents),
  ];

  return cells.map(escapeCsv).join(';');
}

const BOM = '﻿';

@Injectable()
export class ExportPayablesUseCase {
  constructor(private readonly payableExportRepository: IPayableExportRepository) {}

  async execute(
    companyId: string,
    query: ExportPayablesQueryDto,
  ): Promise<ExportedPayablesFile> {
    const filter = {
      companyId,
      supplierId: query.supplierId,
      from: query.from,
      to: query.to,
      limit: EXPORT_PAYABLE_ROW_LIMIT,
    };

    const total = await this.payableExportRepository.count(filter);

    if (total > EXPORT_PAYABLE_ROW_LIMIT) {
      throw new ValidationError(
        `A exportação está limitada a ${EXPORT_PAYABLE_ROW_LIMIT} contas pagas e o filtro atual devolve ${total}. Restrinja o período.`,
        { total, limit: EXPORT_PAYABLE_ROW_LIMIT },
      );
    }

    const rows = await this.payableExportRepository.list(filter);
    const lines = [HEADER.map(escapeCsv).join(';'), ...rows.map(toLine)];
    const stamp = new Date().toISOString().slice(0, 10);

    return {
      filename: `contas-pagas-${stamp}.csv`,
      contentType: 'text/csv; charset=utf-8',
      content: Buffer.from(BOM + lines.join('\r\n'), 'utf8'),
    };
  }
}
