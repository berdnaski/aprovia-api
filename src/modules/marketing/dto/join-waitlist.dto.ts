import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class JoinWaitlistDto {
  @ApiProperty({ example: 'compras@empresa.com.br' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(255)
  email: string;

  @ApiPropertyOptional({ maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional({
    maxLength: 11,
    description: 'Telefone com DDD, somente dígitos (10 ou 11).',
    example: '11990000000',
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.replace(/\D/g, '') : value,
  )
  @IsString()
  @Matches(/^\d{10,11}$/, {
    message: 'Telefone deve ter DDD e número, com 10 ou 11 dígitos.',
  })
  phone?: string;

  @ApiPropertyOptional({ maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  company?: string;

  @ApiPropertyOptional({ description: 'De onde veio o cadastro.' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  source?: string;
}
