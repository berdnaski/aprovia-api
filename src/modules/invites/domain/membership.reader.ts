import { TransactionContext } from 'src/shared/domain/transaction.manager';

export interface MembershipCandidate {
  userId: string;
  email: string;
  name: string;
}

export abstract class IMembershipReader {
  abstract findUserByEmail(email: string): Promise<MembershipCandidate | null>;

  abstract isMember(
    companyId: string,
    email: string,
    context?: TransactionContext,
  ): Promise<boolean>;
}
