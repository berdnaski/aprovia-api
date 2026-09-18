import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ReviewBankAccountDto {
  @ApiPropertyOptional({
    maxLength: 500,
    description: 'Obrigatório ao recusar, opcional ao aprovar.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
