import { CompanyMemberRole, InviteStatus } from 'generated/prisma/enums';
import { TransactionContext } from 'src/shared/domain/transaction.manager';
import { InviteEntity } from './invite.entity';

export interface CreateInviteData {
  companyId: string;
  email: string;
  role: CompanyMemberRole;
  defaultCostCenterId: string | null;
  managerId: string | null;
  invitedById: string;
}

export abstract class IInviteRepository {
  abstract create(
    data: CreateInviteData,
    context?: TransactionContext,
  ): Promise<InviteEntity>;

  abstract findById(
    id: string,
    context?: TransactionContext,
  ): Promise<InviteEntity | null>;

  abstract findPending(
    companyId: string,
    email: string,
  ): Promise<InviteEntity | null>;

  abstract listByCompany(
    companyId: string,
    status?: InviteStatus,
  ): Promise<InviteEntity[]>;

  abstract markAccepted(
    id: string,
    context?: TransactionContext,
  ): Promise<InviteEntity>;

  abstract markRevoked(id: string): Promise<InviteEntity>;

  abstract expirePending(cutoff: Date): Promise<string[]>;
}
