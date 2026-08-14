import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class CancelPurchaseOrderDto {
  @ApiProperty({
    minLength: 10,
    maxLength: 500,
    description:
      'Motivo do cancelamento. Fica registrado na auditoria e é comunicado ao fornecedor (RN54).',
  })
  @IsString()
  @MinLength(10)
  @MaxLength(500)
  reason: string;
}
