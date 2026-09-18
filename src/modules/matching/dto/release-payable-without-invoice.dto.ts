import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsDateString,
  IsNumberString,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { AllocationLineDto } from 'src/modules/purchase-requests/dto/replace-allocations.dto';

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

  @ApiProperty({
    type: [AllocationLineDto],
    required: false,
    description:
      'Rateio por centro de custo. Sem rateio informado, a conta fica sem centro de custo definido.',
  })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => AllocationLineDto)
  @ArrayMaxSize(20)
  allocations?: AllocationLineDto[];
}
