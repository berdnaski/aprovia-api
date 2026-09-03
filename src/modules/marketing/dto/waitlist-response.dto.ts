import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WaitlistEntryEntity } from '../domain/waitlist.entity';

export class WaitlistJoinedDto {
  @ApiProperty({ description: 'Posição na fila.' })
  position: number;

  @ApiProperty()
  alreadyOnList: boolean;
}

export class WaitlistEntryResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiPropertyOptional({ nullable: true })
  name: string | null;

  @ApiPropertyOptional({ nullable: true })
  company: string | null;

  @ApiPropertyOptional({ nullable: true })
  source: string | null;

  @ApiPropertyOptional({ nullable: true })
  invitedAt: string | null;

  @ApiProperty()
  createdAt: string;

  static from(
    this: void,
    entity: WaitlistEntryEntity,
  ): WaitlistEntryResponseDto {
    const dto = new WaitlistEntryResponseDto();

    dto.id = entity.id;
    dto.email = entity.email;
    dto.name = entity.name;
    dto.company = entity.company;
    dto.source = entity.source;
    dto.invitedAt = entity.invitedAt?.toISOString() ?? null;
    dto.createdAt = entity.createdAt.toISOString();

    return dto;
  }
}

export class PublicPlanDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  tier: string;

  @ApiProperty({ type: String })
  priceCents: string;

  @ApiProperty({ nullable: true, type: Number })
  maxRequestsMonth: number | null;

  @ApiProperty({ nullable: true, type: Number })
  maxMembers: number | null;

  @ApiProperty({ type: [String] })
  features: string[];
}
