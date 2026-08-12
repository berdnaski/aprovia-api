import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength,
} from 'class-validator';
import { Urgency } from 'generated/prisma/enums';

export class CreateDraftDto {
  @ApiProperty({ format: 'uuid', description: 'Obrigatório (RN13).' })
  @IsUUID()
  costCenterId: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Opcional no rascunho, obrigatório na submissão (RN34).',
  })
  @IsOptional()
  @IsUUID()
  supplierId?: string;

  @ApiProperty({
    example: 'Notebooks para o time de engenharia',
    maxLength: 200,
  })
  @IsString()
  @Length(3, 200)
  title: string;

  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ enum: ['LOW', 'MEDIUM', 'HIGH'], default: 'MEDIUM' })
  @IsOptional()
  @IsEnum(Urgency)
  urgency?: Urgency;

  @ApiPropertyOptional({ example: '30 dias', maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  paymentTerms?: string;
}
