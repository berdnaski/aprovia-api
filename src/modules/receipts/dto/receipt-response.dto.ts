import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReceiptStatus } from 'generated/prisma/enums';
import { ReceiptEntity, ReceiptItemEntity } from '../domain/receipt.entity';

export class ReceiptItemResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  purchaseOrderItemId: string;

  @ApiProperty({ example: '6.000' })
  quantity: string;

  @ApiProperty({ example: '0.000' })
  rejectedQuantity: string;

  @ApiProperty({ nullable: true, type: String })
  rejectionReason: string | null;

  static fromEntity(
    this: void,
    entity: ReceiptItemEntity,
  ): ReceiptItemResponseDto {
    const dto = new ReceiptItemResponseDto();

    dto.id = entity.id;
    dto.purchaseOrderItemId = entity.purchaseOrderItemId;
    dto.quantity = entity.quantity;
    dto.rejectedQuantity = entity.rejectedQuantity;
    dto.rejectionReason = entity.rejectionReason;

    return dto;
  }
}

export class ReceiptResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'REC-2026-0001' })
  number: string;

  @ApiProperty({ format: 'uuid' })
  purchaseOrderId: string;

  @ApiProperty({ format: 'uuid' })
  receivedById: string;

  @ApiProperty()
  receivedAt: Date;

  @ApiProperty({ enum: ['PARTIAL', 'COMPLETE', 'REJECTED'] })
  status: ReceiptStatus;

  @ApiProperty({ description: 'Houve item recusado nesta entrega.' })
  hasDivergence: boolean;

  @ApiProperty({ nullable: true, type: String })
  notes: string | null;

  @ApiPropertyOptional({ type: [ReceiptItemResponseDto] })
  items?: ReceiptItemResponseDto[];

  static fromEntity(this: void, entity: ReceiptEntity): ReceiptResponseDto {
    const dto = new ReceiptResponseDto();

    dto.id = entity.id;
    dto.number = entity.number;
    dto.purchaseOrderId = entity.purchaseOrderId;
    dto.receivedById = entity.receivedById;
    dto.receivedAt = entity.receivedAt;
    dto.status = entity.status;
    dto.hasDivergence = entity.hasDivergence;
    dto.notes = entity.notes;

    if (entity.items) {
      dto.items = entity.items.map(ReceiptItemResponseDto.fromEntity);
    }

    return dto;
  }
}
