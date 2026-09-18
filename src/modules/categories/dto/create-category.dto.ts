import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength,
} from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Software', maxLength: 120 })
  @IsString()
  @Length(2, 120)
  name: string;

  @ApiPropertyOptional({
    example: 'Licenças, assinaturas e ferramentas digitais',
    maxLength: 300,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string | null;

  @ApiPropertyOptional({
    format: 'uuid',
    nullable: true,
    description:
      'Conta contábil sugerida no rateio dos pedidos desta categoria.',
  })
  @IsOptional()
  @IsUUID()
  defaultAccountId?: string | null;
}
