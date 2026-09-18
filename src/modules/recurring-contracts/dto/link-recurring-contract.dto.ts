import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class LinkRecurringContractDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  contractId: string;

  @ApiPropertyOptional({
    maxLength: 500,
    description:
      'Obrigatório quando o valor da nota difere do esperado em mais de 5%.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  overrideNote?: string;
}
