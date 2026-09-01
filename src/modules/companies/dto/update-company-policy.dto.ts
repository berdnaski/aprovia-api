import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

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

  @ApiPropertyOptional({
    example: 2,
    description: 'Tolerância de preço na conferência (RN46), em percentual.',
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  priceTolerancePercent?: number;

  @ApiPropertyOptional({
    example: 0,
    description: 'Tolerância de quantidade na conferência (RN46).',
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  quantityTolerancePercent?: number;

  @ApiPropertyOptional({
    description: 'Exige recebimento registrado antes de aceitar a nota fiscal.',
  })
  @IsOptional()
  @IsBoolean()
  requiresReceiptBeforeInvoice?: boolean;

  @ApiPropertyOptional({
    description: 'Libera o pagamento sozinho quando a conferência bate.',
  })
  @IsOptional()
  @IsBoolean()
  autoReleaseOnMatch?: boolean;

  @ApiPropertyOptional({
    example: '500000',
    description:
      'Valor em centavos acima do qual a conferência de 3 vias é obrigatória. Nulo exige conferência em qualquer valor.',
  })
  @IsOptional()
  @Transform(({ value }: { value: string | null }) =>
    value === null || value === '' ? null : BigInt(value),
  )
  matchRequiredAboveCents?: bigint | null;

  @ApiPropertyOptional({
    example: 'PO',
    description: 'Prefixo da numeração das ordens de compra.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(8)
  @Matches(/^[A-Z0-9-]+$/, {
    message: 'O prefixo aceita apenas letras maiúsculas, números e hífen',
  })
  poNumberPrefix?: string;
}
