import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length, MaxLength } from 'class-validator';

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
}
