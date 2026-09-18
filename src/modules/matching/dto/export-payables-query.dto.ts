import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsOptional, IsUUID } from 'class-validator';

export class ExportPayablesQueryDto {
  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Restringe a um fornecedor.',
  })
  @IsOptional()
  @IsUUID()
  supplierId?: string;

  @ApiPropertyOptional({
    example: '2026-09-01',
    description: 'Data de pagamento inicial (payables pagos).',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  from?: Date;

  @ApiPropertyOptional({ example: '2026-09-30' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  to?: Date;
}
