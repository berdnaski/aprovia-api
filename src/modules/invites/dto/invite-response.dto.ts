import { ApiProperty } from '@nestjs/swagger';
import { CompanyMemberRole, InviteStatus } from 'generated/prisma/enums';
import { InviteEntity, InvitePreview } from '../domain/invite.entity';
import { PendingInvite } from '../domain/pending-invite';

export class InviteResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty({ enum: ['REQUESTER', 'APPROVER', 'FINANCE_ADMIN'] })
  role: CompanyMemberRole;

  @ApiProperty({ enum: ['PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED'] })
  status: InviteStatus;

  @ApiProperty({ nullable: true, type: String, format: 'uuid' })
  defaultCostCenterId: string | null;

  @ApiProperty({ nullable: true, type: String, format: 'uuid' })
  managerId: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty({ nullable: true, type: Date })
  acceptedAt: Date | null;

  static fromEntity(this: void, entity: InviteEntity): InviteResponseDto {
    const dto = new InviteResponseDto();

    dto.id = entity.id;
    dto.email = entity.email;
    dto.role = entity.role;
    dto.status = entity.status;
    dto.defaultCostCenterId = entity.defaultCostCenterId;
    dto.managerId = entity.managerId;
    dto.createdAt = entity.createdAt;
    dto.acceptedAt = entity.acceptedAt;

    return dto;
  }
}

export class InvitePreviewResponseDto {
  @ApiProperty()
  companyName: string;

  @ApiProperty({ description: 'Só este endereço pode aceitar (RN05).' })
  email: string;

  @ApiProperty({ enum: ['REQUESTER', 'APPROVER', 'FINANCE_ADMIN'] })
  role: CompanyMemberRole;

  @ApiProperty()
  invitedByName: string;

  @ApiProperty()
  actionable: boolean;

  @ApiProperty({ nullable: true, type: String })
  reason: string | null;

  static fromPreview(
    this: void,
    preview: InvitePreview,
  ): InvitePreviewResponseDto {
    const dto = new InvitePreviewResponseDto();

    dto.companyName = preview.companyName;
    dto.email = preview.email;
    dto.role = preview.role;
    dto.invitedByName = preview.invitedByName;
    dto.actionable = preview.actionable;
    dto.reason = preview.reason;

    return dto;
  }
}

export class PendingInviteResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  companyName: string;

  @ApiProperty({
    enum: ['REQUESTER', 'APPROVER', 'FINANCE_ADMIN', 'ACCOUNTANT'],
  })
  role: CompanyMemberRole;

  static fromPending(
    this: void,
    pending: PendingInvite,
  ): PendingInviteResponseDto {
    const dto = new PendingInviteResponseDto();

    dto.id = pending.id;
    dto.companyName = pending.companyName;
    dto.role = pending.role;

    return dto;
  }

  static fromPendingList(
    this: void,
    pending: PendingInvite[],
  ): PendingInviteResponseDto[] {
    return pending.map(PendingInviteResponseDto.fromPending);
  }
}
