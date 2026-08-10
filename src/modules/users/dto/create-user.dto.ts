import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 'Erick Berdnaski', maxLength: 120 })
  @IsString()
  @MinLength(3, { message: 'O nome deve ter ao menos 3 caracteres.' })
  @MaxLength(120)
  @Transform(({ value }: { value: string }) => value?.trim())
  name: string;

  @ApiProperty({ example: 'erick@empresa.com.br', maxLength: 180 })
  @IsEmail({}, { message: 'Informe um e-mail válido.' })
  @MaxLength(180)
  @Transform(({ value }: { value: string }) => value?.trim().toLowerCase())
  email: string;

  @ApiProperty({ example: 'SenhaForte123', minLength: 8, maxLength: 72 })
  @IsString()
  @MinLength(8, { message: 'A senha deve ter ao menos 8 caracteres.' })
  @MaxLength(72)
  password: string;

  @ApiPropertyOptional({ example: '11987654321', maxLength: 20 })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;
}
