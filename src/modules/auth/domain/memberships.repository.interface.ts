import { MembershipEntity } from './membership.entity';

export abstract class IMembershipsRepository {
  abstract findActiveByUser(userId: string): Promise<MembershipEntity | null>;
}
