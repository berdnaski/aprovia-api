import { ApiProperty } from '@nestjs/swagger';
import { CompanyMemberRole } from 'generated/prisma/enums';
import { UserEntity } from 'src/modules/users/domain/user.entity';
import { MembershipEntity } from 'src/modules/companies/domain/membership.entity';

export class AuthUserDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Erick Berdnaski' })
  name: string;

  @ApiProperty({ example: 'erick@empresa.com.br' })
  email: string;

  @ApiProperty({ nullable: true, type: String })
  avatarUrl: string | null;

  @ApiProperty()
  emailVerified: boolean;

  @ApiProperty()
  isSuperAdmin: boolean;

  static fromEntity(entity: UserEntity): AuthUserDto {
    const dto = new AuthUserDto();
    dto.id = entity.id;
    dto.name = entity.name;
    dto.email = entity.email;
    dto.avatarUrl = entity.avatarUrl;
    dto.emailVerified = entity.emailVerified;
    dto.isSuperAdmin = entity.isSuperAdmin;
    return dto;
  }
}

export class AuthMembershipDto {
  @ApiProperty({ format: 'uuid' })
  memberId: string;

  @ApiProperty({ format: 'uuid' })
  companyId: string;

  @ApiProperty({ example: 'Acme Indústria' })
  companyName: string;

  @ApiProperty({ enum: ['REQUESTER', 'APPROVER', 'FINANCE_ADMIN'] })
  role: CompanyMemberRole;

  static fromEntity(entity: MembershipEntity): AuthMembershipDto {
    const dto = new AuthMembershipDto();
    dto.memberId = entity.memberId;
    dto.companyId = entity.companyId;
    dto.companyName = entity.companyName;
    dto.role = entity.role;
    return dto;
  }
}

export class AuthResponseDto {
  @ApiProperty({ type: AuthUserDto })
  user: AuthUserDto;

  @ApiProperty({
    type: AuthMembershipDto,
    nullable: true,
    description: 'Nulo enquanto o usuário não pertence a uma empresa.',
  })
  membership: AuthMembershipDto | null;
}
