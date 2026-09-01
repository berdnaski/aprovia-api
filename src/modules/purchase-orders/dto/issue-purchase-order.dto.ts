import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class IssuePurchaseOrderDto {
  @ApiPropertyOptional({
    example: '2026-09-15',
    description: 'Prazo de entrega acordado com o fornecedor.',
  })
  @IsOptional()
  @IsDateString()
  expectedDeliveryAt?: string;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  deliveryAddress?: string;

  @ApiPropertyOptional({
    maxLength: 200,
    description: 'Sobrescreve as condições de pagamento herdadas do pedido.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  paymentTerms?: string;

  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @ApiPropertyOptional({
    default: 'PO',
    maxLength: 8,
    description:
      'Prefixo da numeração. Omitido, usa o configurado na política da empresa.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(8)
  numberPrefix?: string;
}
