import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RecurringFrequency } from 'generated/prisma/enums';
import {
  IsDateString,
  IsEnum,
  IsNumberString,
  IsOptional,
  IsUUID,
} from 'class-validator';

export class CreateRecurringContractDto {
  @ApiProperty({ enum: RecurringFrequency })
  @IsEnum(RecurringFrequency)
  frequency: RecurringFrequency;

  @ApiPropertyOptional({
    example: '850000',
    description:
      'Valor cobrado por ciclo, em centavos. Sem informar, usa o valor total do pedido.',
  })
  @IsOptional()
  @IsNumberString()
  amountCents?: string;

  @ApiPropertyOptional({
    example: '2026-10-01',
    description: 'Início do primeiro ciclo. Sem informar, começa hoje.',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  costCenterId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  chartAccountId?: string;
}
