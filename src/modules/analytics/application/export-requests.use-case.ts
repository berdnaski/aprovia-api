import { Injectable } from '@nestjs/common';
import { RequestStatus } from 'generated/prisma/enums';
import { RequestActor } from 'src/modules/purchase-requests/application/find-request-by-id.use-case';
import { resolveVisibility } from 'src/modules/purchase-requests/domain/services/request-visibility.service';
import { ValidationError } from 'src/shared/domain/errors/domain.error';
import {
  ExportRequestRow,
  IExportRowsRepository,
} from '../domain/export-rows.repository.interface';
import {
  EXPORT_COLUMNS,
  ExportFormat,
  formatAmount,
  SpreadsheetCell,
  toCsv,
  toReais,
} from '../domain/spreadsheet';
import { ExportRequestsQueryDto } from '../dto/export-requests-query.dto';
import { XlsxWriter } from '../infrastructure/xlsx.writer';

export const EXPORT_ROW_LIMIT = 20000;

const STATUS_LABEL: Record<RequestStatus, string> = {
  DRAFT: 'Rascunho',
  PENDING: 'Aguardando aprovação',
  APPROVED: 'Aprovado',
  COMPLETED: 'Concluído',
  REJECTED: 'Rejeitado',
  CHANGES_REQUESTED: 'Devolvido para ajuste',
  CANCELED: 'Cancelado',
};

export interface ExportedFile {
  filename: string;
  contentType: string;
  content: Buffer;
}

function formatDate(value: Date | null): string {
  if (!value) {
    return '';
  }

  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(value);
}

function toCells(row: ExportRequestRow): SpreadsheetCell[] {
  return [
    { text: row.number },
    { text: STATUS_LABEL[row.status] },
    { text: row.title },
    { text: row.costCenterName },
    { text: row.categoryName ?? '' },
    { text: row.supplierName ?? '' },
    { text: row.supplierCnpj ?? '' },
    { text: row.requesterName },
    {
      text: formatAmount(row.totalAmountCents),
      amount: toReais(row.totalAmountCents),
    },
    { text: formatDate(row.createdAt) },
    { text: formatDate(row.submittedAt) },
    { text: formatDate(row.finalizedAt) },
  ];
}

@Injectable()
export class ExportRequestsUseCase {
  constructor(
    private readonly exportRowsRepository: IExportRowsRepository,
    private readonly xlsxWriter: XlsxWriter,
  ) {}

  async execute(
    actor: RequestActor,
    query: ExportRequestsQueryDto,
  ): Promise<ExportedFile> {
    const filter = {
      visibility: resolveVisibility(
        actor.memberId,
        actor.companyId,
        actor.role,
      ),
      status: query.status,
      costCenterId: query.costCenterId,
      supplierId: query.supplierId,
      categoryId: query.categoryId,
      from: query.from,
      to: query.to,
      limit: EXPORT_ROW_LIMIT,
    };

    const total = await this.exportRowsRepository.countRequests(filter);

    if (total > EXPORT_ROW_LIMIT) {
      throw new ValidationError(
        `A exportação está limitada a ${EXPORT_ROW_LIMIT} linhas e o filtro atual devolve ${total}. Restrinja o período ou o Centro de Custo`,
        { total, limit: EXPORT_ROW_LIMIT },
      );
    }

    const rows = await this.exportRowsRepository.listRequests(filter);
    const cells = rows.map(toCells);
    const stamp = new Date().toISOString().slice(0, 10);

    if (query.format === ExportFormat.XLSX) {
      return {
        filename: `requisicoes-${stamp}.xlsx`,
        contentType:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        content: await this.xlsxWriter.write(EXPORT_COLUMNS, cells),
      };
    }

    return {
      filename: `requisicoes-${stamp}.csv`,
      contentType: 'text/csv; charset=utf-8',
      content: Buffer.from(toCsv(EXPORT_COLUMNS, cells), 'utf8'),
    };
  }
}
