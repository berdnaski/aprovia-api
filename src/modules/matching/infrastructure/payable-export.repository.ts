import { Injectable } from '@nestjs/common';
import { Prisma, PayableStatus } from 'generated/prisma/client';
import { PrismaService } from 'src/shared/infrastructure/database/prisma.service';
import {
  IPayableExportRepository,
  PayableExportFilter,
  PayableExportRow,
} from '../domain/payable-export.repository.interface';

const INCLUDE = {
  supplier: true,
  invoice: { include: { taxes: true } },
  service_invoice: { include: { withholdings: true } },
  allocations: { include: { cost_center: true, chart_account: true } },
} as const;

type PayableWithRelations = Prisma.PayableGetPayload<{ include: typeof INCLUDE }>;

function whereFor(filter: PayableExportFilter): Prisma.PayableWhereInput {
  return {
    company_id: filter.companyId,
    status: PayableStatus.PAID,
    ...(filter.supplierId && { supplier_id: filter.supplierId }),
    ...((filter.from || filter.to) && {
      paid_at: {
        ...(filter.from && { gte: filter.from }),
        ...(filter.to && { lte: filter.to }),
      },
    }),
  };
}

function toRows(payable: PayableWithRelations): PayableExportRow[] {
  const documentNumber = payable.service_invoice?.number ?? payable.invoice?.number ?? null;

  const grossAmountCents = payable.service_invoice
    ? payable.service_invoice.gross_amount_cents
    : payable.amount_cents;

  const withholdings = payable.service_invoice
    ? payable.service_invoice.withholdings.map((item) => ({
        kind: item.kind as string,
        amountCents: item.amount_cents,
      }))
    : (payable.invoice?.taxes ?? [])
        .filter((tax) => tax.withheld)
        .map((tax) => ({
          kind: tax.kind === 'ISS' ? 'ISS_RETIDO' : (tax.kind as string),
          amountCents: tax.amount_cents,
        }));

  const base = {
    payableId: payable.id,
    supplierName: payable.supplier.trade_name ?? payable.supplier.legal_name,
    supplierCnpj: payable.supplier.cnpj,
    documentNumber,
    dueDate: payable.due_date,
    paidAt: payable.paid_at,
    grossAmountCents,
    netAmountCents: payable.amount_cents,
    withholdings,
  };

  if (payable.allocations.length === 0) {
    return [
      {
        ...base,
        costCenterName: 'Sem rateio definido',
        costCenterCode: null,
        chartAccountCode: null,
        chartAccountName: null,
        allocationAmountCents: payable.amount_cents,
      },
    ];
  }

  return payable.allocations.map((allocation) => ({
    ...base,
    costCenterName: allocation.cost_center.name,
    costCenterCode: allocation.cost_center.code,
    chartAccountCode:
      allocation.chart_account?.external_code ?? allocation.chart_account?.code ?? null,
    chartAccountName: allocation.chart_account?.name ?? null,
    allocationAmountCents: allocation.amount_cents,
  }));
}

@Injectable()
export class PayableExportRepository implements IPayableExportRepository {
  constructor(private readonly prisma: PrismaService) {}

  async count(filter: PayableExportFilter): Promise<number> {
    return this.prisma.payable.count({ where: whereFor(filter) });
  }

  async list(filter: PayableExportFilter): Promise<PayableExportRow[]> {
    const payables = await this.prisma.payable.findMany({
      where: whereFor(filter),
      include: INCLUDE,
      orderBy: { paid_at: 'asc' },
      take: filter.limit,
    });

    return payables.flatMap(toRows);
  }
}
