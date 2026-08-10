import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({
    example: 'a1b2c3d4e5f6...',
    description: 'Token recebido por e-mail. Uso único, expira em 1 hora.',
  })
  @IsString()
  @IsNotEmpty({ message: 'Token obrigatório.' })
  token: string;

  @ApiProperty({ example: 'NovaSenha123', minLength: 8, maxLength: 72 })
  @IsString()
  @MinLength(8, { message: 'A senha deve ter ao menos 8 caracteres.' })
  @MaxLength(72)
  password: string;
}
