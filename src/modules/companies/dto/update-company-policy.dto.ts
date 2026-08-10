import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsNumber, Max, Min } from 'class-validator';

export class UpdateCompanyPolicyDto {
  @ApiPropertyOptional({
    example: 5,
    description: 'Tolerância de estouro de orçamento, em percentual (RN18).',
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  overrunTolerancePercent?: number;

  @ApiPropertyOptional({
    example: 24,
    description: 'Horas úteis até o lembrete ao aprovador (RN31).',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(720)
  reminderHours?: number;

  @ApiPropertyOptional({
    example: 72,
    description: 'Horas úteis até o escalonamento automático (RN32).',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(720)
  escalationHours?: number;

  @ApiPropertyOptional({
    example: '50000000',
    description:
      'Valor crítico em centavos a partir do qual exige dupla aprovação (RN26). Nulo desativa.',
  })
  @IsOptional()
  @Transform(({ value }: { value: string | null }) =>
    value === null || value === '' ? null : BigInt(value),
  )
  dualApprovalThresholdCents?: bigint | null;
}
