import { CompanyMemberModel as PrismaCompanyMember } from 'generated/prisma/models';
import { CompanyMemberEntity } from '../../domain/company-member.entity';

type PrismaCompanyMemberWithUser = PrismaCompanyMember & {
  user?: {
    id: string;
    name: string;
    email: string;
    avatar_url: string | null;
  } | null;
};

export class CompanyMemberMapper {
  static toDomain(
    this: void,
    raw: PrismaCompanyMemberWithUser,
  ): CompanyMemberEntity {
    const entity = new CompanyMemberEntity();

    if (raw.user) {
      entity.user = {
        id: raw.user.id,
        name: raw.user.name,
        email: raw.user.email,
        avatarUrl: raw.user.avatar_url,
      };
    }

    entity.id = raw.id;
    entity.userId = raw.user_id;
    entity.companyId = raw.company_id;
    entity.role = raw.role;
    entity.approvalLimitCents = raw.approval_limit_cents;
    entity.defaultCostCenterId = raw.default_cost_center_id;
    entity.managerId = raw.manager_id;
    entity.absentFrom = raw.absent_from;
    entity.absentUntil = raw.absent_until;
    entity.substituteId = raw.substitute_id;
    entity.createdAt = raw.created_at;
    entity.updatedAt = raw.updated_at;
    entity.disabledAt = raw.disabled_at;

    return entity;
  }
}
