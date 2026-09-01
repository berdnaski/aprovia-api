import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsNumberString,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class ReleasePayableWithoutInvoiceDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  supplierId: string;

  @ApiProperty({ example: '9900', description: 'Valor em centavos.' })
  @IsNumberString()
  amountCents: string;

  @ApiProperty({ example: '2026-09-01' })
  @IsDateString()
  dueDate: string;

  @ApiProperty({
    minLength: 10,
    maxLength: 500,
    description:
      'Por que este pagamento não tem nota fiscal conferível (RN65). Ex.: assinatura de software no exterior.',
  })
  @IsString()
  @MinLength(10)
  @MaxLength(500)
  note: string;
}
