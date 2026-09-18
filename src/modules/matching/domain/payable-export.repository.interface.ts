export interface PayableExportFilter {
  companyId: string;
  supplierId?: string;
  from?: Date;
  to?: Date;
  limit: number;
}

export interface PayableExportWithholdingRow {
  kind: string;
  amountCents: bigint;
}

export interface PayableExportRow {
  payableId: string;
  supplierName: string;
  supplierCnpj: string;
  documentNumber: string | null;
  dueDate: Date;
  paidAt: Date | null;
  grossAmountCents: bigint;
  netAmountCents: bigint;
  withholdings: PayableExportWithholdingRow[];
  costCenterName: string;
  costCenterCode: string | null;
  chartAccountCode: string | null;
  chartAccountName: string | null;
  allocationAmountCents: bigint;
}

export abstract class IPayableExportRepository {
  abstract count(filter: PayableExportFilter): Promise<number>;

  abstract list(filter: PayableExportFilter): Promise<PayableExportRow[]>;
}
