import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { CompanyMemberRole } from 'generated/prisma/enums';
import { AuthenticatedUser } from 'src/shared/domain/authenticated-user';
import { ForbiddenError } from 'src/shared/domain/errors/domain.error';
import { RequestActor } from '../application/find-request-by-id.use-case';

export const ALL_ROLES = [
  CompanyMemberRole.REQUESTER,
  CompanyMemberRole.APPROVER,
  CompanyMemberRole.FINANCE_ADMIN,
] as const;

export const APPROVER_ROLES = [
  CompanyMemberRole.APPROVER,
  CompanyMemberRole.FINANCE_ADMIN,
] as const;

export const OPERATIONAL_ROLES = [
  CompanyMemberRole.REQUESTER,
  CompanyMemberRole.FINANCE_ADMIN,
] as const;

export const CurrentActor = createParamDecorator(
  (_data: unknown, context: ExecutionContext): RequestActor => {
    const { user } = context
      .switchToHttp()
      .getRequest<{ user?: AuthenticatedUser }>();

    if (!user?.companyId || !user.memberId || !user.role) {
      throw new ForbiddenError('Nenhuma empresa ativa nesta sessão');
    }

    return {
      memberId: user.memberId,
      userId: user.userId,
      companyId: user.companyId,
      role: user.role,
    };
  },
);
