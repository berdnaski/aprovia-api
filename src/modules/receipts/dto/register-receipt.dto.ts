import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsNumberString,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class ReceiptItemDto {
  @ApiProperty({ format: 'uuid', description: 'Item da ordem de compra.' })
  @IsUUID()
  purchaseOrderItemId: string;

  @ApiProperty({
    example: '6.000',
    description: 'Quantidade aceita nesta entrega. Aceita até 3 casas decimais.',
  })
  @IsNumberString()
  quantity: string;

  @ApiPropertyOptional({
    example: '1.000',
    default: '0',
    description: 'Quantidade que chegou mas foi recusada.',
  })
  @IsOptional()
  @IsNumberString()
  rejectedQuantity?: string;

  @ApiPropertyOptional({
    maxLength: 300,
    description: 'Obrigatório quando há quantidade recusada.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  rejectionReason?: string;
}

export class RegisterReceiptDto {
  @ApiProperty({ type: [ReceiptItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ReceiptItemDto)
  items: ReceiptItemDto[];

  @ApiPropertyOptional({
    example: '2026-09-15T14:30:00.000Z',
    description: 'Quando a mercadoria chegou. O padrão é agora.',
  })
  @IsOptional()
  @IsDateString()
  receivedAt?: string;

  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
