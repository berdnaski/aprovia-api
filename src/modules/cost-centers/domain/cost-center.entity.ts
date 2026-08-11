export class CostCenterEntity {
  id: string;
  companyId: string;
  name: string;
  code: string | null;
  managerId: string;
  parentId: string | null;
  createdAt: Date;
  updatedAt: Date;
  disabledAt: Date | null;
}
