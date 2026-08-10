import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, MaxLength } from 'class-validator';

export class ResendVerificationDto {
  @ApiProperty({ example: 'erick@empresa.com.br', maxLength: 180 })
  @IsEmail({}, { message: 'Informe um e-mail válido.' })
  @MaxLength(180)
  @Transform(({ value }: { value: string }) => value?.trim().toLowerCase())
  email: string;
}
