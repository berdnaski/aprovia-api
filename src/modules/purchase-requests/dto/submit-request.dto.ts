import { ApiPropertyOptional } from '@nestjs/swagger';
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
}
