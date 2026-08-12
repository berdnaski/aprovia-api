export class CategoryEntity {
  id: string;
  companyId: string;
  name: string;
  description: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}
