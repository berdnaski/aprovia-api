export class BudgetEntity {
  id: string;
  costCenterId: string;
  periodStart: Date;
  periodEnd: Date;
  totalAmountCents: bigint;
  changeReason: string | null;
  updatedById: string | null;
  createdAt: Date;
  updatedAt: Date;
}
