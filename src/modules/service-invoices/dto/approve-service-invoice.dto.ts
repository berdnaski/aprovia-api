import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsDateString,
  IsOptional,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { AllocationLineDto } from 'src/modules/purchase-requests/dto/replace-allocations.dto';

export class ApproveServiceInvoiceDto {
  @ApiProperty({
    format: 'uuid',
    description:
      'Fornecedor a pagar. Obrigatório se a nota ainda não veio com um fornecedor vinculado no cadastro.',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  supplierId?: string;

  @ApiProperty({
    example: '2026-10-05',
    description: 'Vencimento do pagamento — não vem na NFS-e, defina aqui.',
  })
  @IsDateString()
  dueDate: string;

  @ApiProperty({
    type: [AllocationLineDto],
    required: false,
    description:
      'Rateio por centro de custo. Sem rateio informado, a conta a pagar fica sem centro de custo definido — edite depois em Contas a Pagar.',
  })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => AllocationLineDto)
  @ArrayMaxSize(20)
  allocations?: AllocationLineDto[];
}
