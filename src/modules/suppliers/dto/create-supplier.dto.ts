import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';

export class CreateSupplierDto {
  @ApiProperty({
    example: '12345678000199',
    description: 'Com ou sem máscara. Os dígitos verificadores são conferidos.',
  })
  @IsString()
  @Length(14, 18)
  cnpj: string;

  @ApiProperty({
    example: 'Acme Indústria LTDA',
    description:
      'Usado apenas se a consulta à Receita Federal falhar (RNF14). Com sucesso, o valor da API prevalece.',
    maxLength: 180,
  })
  @IsString()
  @MaxLength(180)
  legalName: string;

  @ApiPropertyOptional({ example: 'Acme', maxLength: 180, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(180)
  tradeName?: string | null;

  @ApiPropertyOptional({ example: 'Av. Paulista, 1000', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  street?: string | null;

  @ApiPropertyOptional({ example: 'São Paulo', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  city?: string | null;

  @ApiPropertyOptional({ example: 'SP', nullable: true })
  @IsOptional()
  @IsString()
  @Length(2, 2)
  state?: string | null;

  @ApiPropertyOptional({ example: '01310100', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(9)
  zipCode?: string | null;

  @ApiPropertyOptional({ example: 'contato@acme.com.br', nullable: true })
  @IsOptional()
  @IsEmail()
  @MaxLength(180)
  email?: string | null;

  @ApiPropertyOptional({ example: '1130000000', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string | null;
}
