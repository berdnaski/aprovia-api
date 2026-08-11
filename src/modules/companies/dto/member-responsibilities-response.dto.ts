import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MemberResponsibilities } from '../application/get-member-responsibilities.use-case';
import {
  BlockerDetailValue,
  ResponsibilityBlockerKind,
} from '../domain/member-responsibility-guard';

export class ResponsibilityBlockerItemDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Tecnologia' })
  label: string;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: { type: 'string', nullable: true },
    example: { code: 'CC-01' },
  })
  details?: Readonly<Record<string, BlockerDetailValue>>;
}

export class ResponsibilityBlockerDto {
  @ApiProperty({ enum: ['COST_CENTER_MANAGER', 'PENDING_APPROVAL'] })
  kind: ResponsibilityBlockerKind;

  @ApiProperty({ example: 'é gestor de 1 Centro de Custo' })
  message: string;

  @ApiProperty({ type: [ResponsibilityBlockerItemDto] })
  items: ResponsibilityBlockerItemDto[];
}

export class MemberRefDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  userId: string;
}

export class MemberResponsibilitiesResponseDto {
  @ApiProperty({
    type: [ResponsibilityBlockerDto],
    description: 'Exigem transferência prévia antes da inativação (RF25).',
  })
  blockers: ResponsibilityBlockerDto[];

  @ApiProperty({
    type: [MemberRefDto],
    description: 'Sobem para o gestor do membro na inativação.',
  })
  subordinates: MemberRefDto[];

  @ApiProperty({
    type: [MemberRefDto],
    description: 'Têm o ponteiro de substituto zerado na inativação.',
  })
  substituteFor: MemberRefDto[];

  @ApiProperty({ description: 'Se true, o DELETE responde 409.' })
  blocksDeactivation: boolean;

  static fromDomain(
    responsibilities: MemberResponsibilities,
  ): MemberResponsibilitiesResponseDto {
    const dto = new MemberResponsibilitiesResponseDto();
    dto.blockers = responsibilities.blockers;
    dto.subordinates = responsibilities.subordinates;
    dto.substituteFor = responsibilities.substituteFor;
    dto.blocksDeactivation = responsibilities.blocksDeactivation;
    return dto;
  }
}
