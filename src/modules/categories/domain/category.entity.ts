export class CategoryEntity {
  id: string;
  companyId: string;
  name: string;
  description: string | null;
  active: boolean;
  defaultAccountId: string | null;
  createdAt: Date;
  updatedAt: Date;
}
