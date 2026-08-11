import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, Matches } from 'class-validator';
import { BudgetPeriodType } from '../domain/services/budget-period.service';

export class CreateBudgetDto {
  @ApiProperty({
    example: '2026-09',
    description:
      'Mês de início do período, no formato AAAA-MM. É um mês de calendário, não um instante: não sofre efeito de fuso horário (RN16).',
  })
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, {
    message: 'O período deve estar no formato AAAA-MM',
  })
  period: string;

  @ApiPropertyOptional({
    enum: ['MONTHLY', 'QUARTERLY', 'ANNUAL'],
    default: 'MONTHLY',
    description:
      'RF29. Trimestral exige início em janeiro, abril, julho ou outubro; anual exige início em janeiro. O padrão é mensal (RN16).',
  })
  @IsOptional()
  @IsEnum(BudgetPeriodType)
  periodType?: BudgetPeriodType;

  @ApiProperty({
    example: '5000000',
    description: 'Teto de gasto do período, em centavos.',
  })
  @Transform(({ value }: { value: string | number }) => BigInt(value))
  totalAmountCents: bigint;
}
