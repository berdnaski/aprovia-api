import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsUUID } from 'class-validator';

export class ResolveApprovalRuleQueryDto {
  @ApiProperty({
    example: '250000',
    description: 'Valor do pedido em centavos.',
  })
  @Transform(({ value }: { value: string }) => BigInt(value))
  amountCents: bigint;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  costCenterId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;
}

export class ListApprovalRulesQueryDto {
  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Filtra a matriz específica deste Centro de Custo.',
  })
  @IsOptional()
  @IsUUID()
  costCenterId?: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Filtra a matriz específica desta categoria.',
  })
  @IsOptional()
  @IsUUID()
  categoryId?: string;
}
