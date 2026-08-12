import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class CancelRequestDto {
  @ApiProperty({
    minLength: 10,
    maxLength: 500,
    description:
      'Obrigatório. Em pedido já aprovado, é a justificativa da reversão registrada na auditoria (RN41).',
  })
  @IsString()
  @MinLength(10)
  @MaxLength(500)
  reason: string;
}
