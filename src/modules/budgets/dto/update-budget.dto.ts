import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateBudgetDto {
  @ApiProperty({
    example: '7500000',
    description: 'Novo teto do período, em centavos.',
  })
  @Transform(({ value }: { value: string | number }) => BigInt(value))
  totalAmountCents: bigint;

  @ApiPropertyOptional({
    example: 'Reforço aprovado pela diretoria',
    maxLength: 500,
    description: 'Motivo da alteração, registrado junto com o autor (RF30).',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  changeReason?: string;
}
