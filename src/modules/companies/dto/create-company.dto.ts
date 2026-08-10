import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateCompanyDto {
  @ApiProperty({ example: 'Acme Indústria LTDA', maxLength: 180 })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(180)
  @Transform(({ value }: { value: string }) => value?.trim())
  legalName: string;

  @ApiPropertyOptional({ example: 'Acme', maxLength: 180 })
  @IsOptional()
  @IsString()
  @MaxLength(180)
  @Transform(({ value }: { value: string }) => value?.trim())
  tradeName?: string;

  @ApiProperty({ example: '12345678000199', description: 'Apenas dígitos' })
  @IsString()
  @Length(14, 14, { message: 'O CNPJ deve conter 14 dígitos.' })
  @Transform(({ value }: { value: string }) => value?.replace(/\D/g, ''))
  cnpj: string;

  @ApiPropertyOptional({ example: 'Indústria', maxLength: 80 })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  industry?: string;

  @ApiPropertyOptional({ example: '51-200', maxLength: 20 })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  companySize?: string;
}
