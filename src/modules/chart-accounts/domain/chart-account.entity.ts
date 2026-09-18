import type { ChartAccountKind } from 'generated/prisma/enums';

export class ChartAccountEntity {
  id: string;
  companyId: string;
  parentId: string | null;
  code: string;
  name: string;
  kind: ChartAccountKind;
  postable: boolean;
  externalCode: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}
