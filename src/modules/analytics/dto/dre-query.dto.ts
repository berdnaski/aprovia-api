import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsOptional } from 'class-validator';

export class DreQueryDto {
  @ApiPropertyOptional({
    example: '2026-09-01',
    description: 'Início do período. Padrão: primeiro dia do mês atual.',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  from?: Date;

  @ApiPropertyOptional({
    example: '2026-09-30',
    description: 'Fim do período. Padrão: hoje.',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  to?: Date;
}
