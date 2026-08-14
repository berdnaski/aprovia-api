import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class LinkInvoiceDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  purchaseOrderId: string;
}
