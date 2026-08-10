import { ApiProperty } from '@nestjs/swagger';
import { CompanyMemberRole } from 'generated/prisma/enums';
import { IsEnum } from 'class-validator';

export class UpdateMemberRoleDto {
  @ApiProperty({ enum: ['REQUESTER', 'APPROVER', 'FINANCE_ADMIN'] })
  @IsEnum(CompanyMemberRole)
  role: CompanyMemberRole;
}
