import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { DecisionType } from 'generated/prisma/enums';

export const EMAIL_DECISIONS = [
  DecisionType.APPROVED,
  DecisionType.REJECTED,
] as const;

export class DecideByEmailDto {
  @ApiProperty({ enum: ['APPROVED', 'REJECTED'] })
  @IsEnum(EMAIL_DECISIONS)
  type: (typeof EMAIL_DECISIONS)[number];

  @ApiPropertyOptional({
    description: 'Obrigatória na rejeição, com ao menos 10 caracteres (RN44).',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  justification?: string;
}
