import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ReleasePayableDto {
  @ApiPropertyOptional({
    maxLength: 500,
    description: 'Observação registrada junto com a liberação.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
