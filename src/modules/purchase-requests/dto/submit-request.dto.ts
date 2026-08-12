import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';

export class SubmitRequestDto {
  @ApiPropertyOptional({
    default: false,
    description:
      'Confirmação explícita de que não é duplicata, exigida quando há pedido parecido nos últimos 30 dias (RN36).',
  })
  @IsOptional()
  @IsBoolean()
  confirmDuplicate?: boolean;

  @ApiPropertyOptional({
    example: '250000',
    description:
      'Saldo disponível do período, usado para marcar requiresOverride quando o valor estoura a tolerância (RN19). Orçamento esgotado não bloqueia a submissão (RN20).',
  })
  @IsOptional()
  @Transform(({ value }: { value: string | number }) => BigInt(value))
  availableCents?: bigint;
}
