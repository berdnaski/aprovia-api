import { CompanyMemberRole, InviteStatus } from 'generated/prisma/enums';

export interface InviteEntity {
  id: string;
  companyId: string;
  email: string;
  role: CompanyMemberRole;
  defaultCostCenterId: string | null;
  managerId: string | null;
  status: InviteStatus;
  invitedById: string;
  createdAt: Date;
  acceptedAt: Date | null;
  revokedAt: Date | null;
}

export interface InvitePreview {
  companyName: string;
  email: string;
  role: CompanyMemberRole;
  invitedByName: string;
  actionable: boolean;
  reason: string | null;
}
