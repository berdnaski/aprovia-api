import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'erick@empresa.com.br', maxLength: 180 })
  @IsEmail({}, { message: 'Informe um e-mail válido.' })
  @MaxLength(180)
  @Transform(({ value }: { value: string }) => value?.trim().toLowerCase())
  email: string;

  @ApiProperty({ example: 'SenhaForte123', maxLength: 72 })
  @IsString()
  @MinLength(1, { message: 'Informe a senha.' })
  @MaxLength(72)
  password: string;
}
