import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { DecisionType } from 'generated/prisma/enums';

export class DecideRequestDto {
  @ApiProperty({
    enum: [
      'APPROVED',
      'REJECTED',
      'CHANGES_REQUESTED',
      'APPROVED_WITH_OVERRIDE',
    ],
  })
  @IsEnum(DecisionType)
  type: DecisionType;

  @ApiPropertyOptional({
    maxLength: 1000,
    description:
      'Obrigatória com no mínimo 10 caracteres para rejeição, devolução e aprovação com ressalva (RN44).',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  justification?: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description:
      'Aprovador original, quando a decisão é tomada por substituto temporário (RN29).',
  })
  @IsOptional()
  @IsUUID()
  onBehalfOfId?: string;
}
