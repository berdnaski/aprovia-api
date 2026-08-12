import { InviteModel as PrismaInvite } from 'generated/prisma/models';
import { InviteEntity } from '../../domain/invite.entity';

export class InviteMapper {
  static toDomain(this: void, raw: PrismaInvite): InviteEntity {
    return {
      id: raw.id,
      companyId: raw.company_id,
      email: raw.email,
      role: raw.role,
      defaultCostCenterId: raw.default_cost_center_id,
      managerId: raw.manager_id,
      status: raw.status,
      invitedById: raw.invited_by_id,
      createdAt: raw.created_at,
      acceptedAt: raw.accepted_at,
      revokedAt: raw.revoked_at,
    };
  }
}
