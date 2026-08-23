import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CompanyMemberRole } from 'generated/prisma/enums';
import { CompanyMemberEntity } from '../domain/company-member.entity';

export class CompanyMemberUserDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Erick Berdnaski' })
  name: string;

  @ApiProperty({ example: 'erick@empresa.com.br' })
  email: string;

  @ApiProperty({ nullable: true, type: String })
  avatarUrl: string | null;
}

export class CompanyMemberResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  userId: string;

  @ApiPropertyOptional({
    type: CompanyMemberUserDto,
    description:
      'Dados da pessoa por trás do vínculo. Presente nas rotas de listagem e detalhe.',
  })
  user?: CompanyMemberUserDto;

  @ApiProperty({ enum: ['REQUESTER', 'APPROVER', 'FINANCE_ADMIN'] })
  role: CompanyMemberRole;

  @ApiProperty({ example: '1000000', description: 'Alçada em centavos' })
  approvalLimitCents: string;

  @ApiProperty({ format: 'uuid', nullable: true, type: String })
  defaultCostCenterId: string | null;

  @ApiProperty({ format: 'uuid', nullable: true, type: String })
  managerId: string | null;

  @ApiProperty({ nullable: true, type: Date })
  absentFrom: Date | null;

  @ApiProperty({ nullable: true, type: Date })
  absentUntil: Date | null;

  @ApiProperty({ format: 'uuid', nullable: true, type: String })
  substituteId: string | null;

  @ApiProperty()
  createdAt: Date;

  static fromEntity(entity: CompanyMemberEntity): CompanyMemberResponseDto {
    const dto = new CompanyMemberResponseDto();
    dto.id = entity.id;
    dto.userId = entity.userId;
    dto.user = entity.user;
    dto.role = entity.role;
    dto.approvalLimitCents = entity.approvalLimitCents.toString();
    dto.defaultCostCenterId = entity.defaultCostCenterId;
    dto.managerId = entity.managerId;
    dto.absentFrom = entity.absentFrom;
    dto.absentUntil = entity.absentUntil;
    dto.substituteId = entity.substituteId;
    dto.createdAt = entity.createdAt;
    return dto;
  }

  static fromEntities(
    entities: CompanyMemberEntity[],
  ): CompanyMemberResponseDto[] {
    return entities.map((entity) =>
      CompanyMemberResponseDto.fromEntity(entity),
    );
  }
}
