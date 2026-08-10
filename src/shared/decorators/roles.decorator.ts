import { SetMetadata } from '@nestjs/common';
import { CompanyMemberRole } from 'generated/prisma/enums';


export const ROLES_KEY = 'roles';

export const Roles = (...roles: CompanyMemberRole[]) =>
  SetMetadata(ROLES_KEY, roles);
