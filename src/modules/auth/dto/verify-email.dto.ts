import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class VerifyEmailDto {
  @ApiProperty({
    example: 'a1b2c3d4e5f6...',
    description: 'Token recebido por e-mail. Uso único, expira em 24 horas.',
  })
  @IsString()
  @IsNotEmpty({ message: 'Token obrigatório.' })
  token: string;
}
