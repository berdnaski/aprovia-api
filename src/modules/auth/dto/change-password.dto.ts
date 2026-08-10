import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({ example: 'SenhaAtual123', maxLength: 72 })
  @IsString()
  @IsNotEmpty({ message: 'Informe a senha atual.' })
  @MaxLength(72)
  currentPassword: string;

  @ApiProperty({ example: 'NovaSenha123', minLength: 8, maxLength: 72 })
  @IsString()
  @MinLength(8, { message: 'A nova senha deve ter ao menos 8 caracteres.' })
  @MaxLength(72)
  newPassword: string;
}

export class ConfirmPasswordChangeDto {
  @ApiProperty({
    example: 'a1b2c3d4e5f6...',
    description: 'Token de confirmação recebido por e-mail. Expira em 1 hora.',
  })
  @IsString()
  @IsNotEmpty({ message: 'Token obrigatório.' })
  token: string;
}
