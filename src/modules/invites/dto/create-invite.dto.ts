import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { CompanyMemberRole } from 'generated/prisma/enums';

export class CreateInviteDto {
  @ApiProperty({ example: 'novo.membro@empresa.com.br' })
  @IsEmail()
  email: string;

  @ApiProperty({ enum: ['REQUESTER', 'APPROVER', 'FINANCE_ADMIN'] })
  @IsEnum(CompanyMemberRole)
  role: CompanyMemberRole;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  defaultCostCenterId?: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'Líder direto (RN24).' })
  @IsOptional()
  @IsUUID()
  managerId?: string;
}
