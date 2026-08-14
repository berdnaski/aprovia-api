import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PurchaseOrderStatus } from 'generated/prisma/enums';
import {
  PurchaseOrderEntity,
  PurchaseOrderItemEntity,
} from '../domain/purchase-order.entity';
import { ItemBalance } from '../domain/purchase-orders.repository.interface';

export class PurchaseOrderItemResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  description: string;

  @ApiProperty({ example: '10.000' })
  quantity: string;

  @ApiProperty({ example: 'UN' })
  unit: string;

  @ApiProperty({ example: '250000', description: 'Valor unitário em centavos.' })
  unitPriceCents: string;

  @ApiProperty({ example: '2500000' })
  totalCents: string;

  @ApiProperty({ example: '4.000', description: 'Quantidade já recebida.' })
  receivedQuantity: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  ncm: string | null;

  static fromEntity(
    this: void,
    entity: PurchaseOrderItemEntity,
  ): PurchaseOrderItemResponseDto {
    const dto = new PurchaseOrderItemResponseDto();

    dto.id = entity.id;
    dto.description = entity.description;
    dto.quantity = entity.quantity;
    dto.unit = entity.unit;
    dto.unitPriceCents = entity.unitPriceCents.toString();
    dto.totalCents = entity.totalCents.toString();
    dto.receivedQuantity = entity.receivedQuantity;
    dto.ncm = entity.ncm;

    return dto;
  }
}

export class PurchaseOrderResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'PO-2026-0001' })
  number: string;

  @ApiProperty({ format: 'uuid' })
  purchaseRequestId: string;

  @ApiProperty({ format: 'uuid' })
  supplierId: string;

  @ApiProperty({
    enum: [
      'DRAFT',
      'ISSUED',
      'SENT',
      'PARTIALLY_RECEIVED',
      'RECEIVED',
      'CLOSED',
      'CANCELED',
    ],
  })
  status: PurchaseOrderStatus;

  @ApiProperty({ example: '2500000' })
  totalAmountCents: string;

  @ApiProperty({ example: 'BRL' })
  currency: string;

  @ApiProperty({ format: 'uuid' })
  issuedById: string;

  @ApiProperty()
  issuedAt: Date;

  @ApiProperty({ nullable: true, type: Date })
  expectedDeliveryAt: Date | null;

  @ApiProperty({ nullable: true, type: Date })
  sentToSupplierAt: Date | null;

  @ApiProperty({ nullable: true, type: String })
  deliveryAddress: string | null;

  @ApiProperty({ nullable: true, type: String })
  paymentTerms: string | null;

  @ApiProperty({ nullable: true, type: String })
  notes: string | null;

  @ApiProperty({ nullable: true, type: Date })
  canceledAt: Date | null;

  @ApiProperty({ nullable: true, type: String })
  cancelReason: string | null;

  @ApiPropertyOptional({ type: [PurchaseOrderItemResponseDto] })
  items?: PurchaseOrderItemResponseDto[];

  static fromEntity(
    this: void,
    entity: PurchaseOrderEntity,
  ): PurchaseOrderResponseDto {
    const dto = new PurchaseOrderResponseDto();

    dto.id = entity.id;
    dto.number = entity.number;
    dto.purchaseRequestId = entity.purchaseRequestId;
    dto.supplierId = entity.supplierId;
    dto.status = entity.status;
    dto.totalAmountCents = entity.totalAmountCents.toString();
    dto.currency = entity.currency;
    dto.issuedById = entity.issuedById;
    dto.issuedAt = entity.issuedAt;
    dto.expectedDeliveryAt = entity.expectedDeliveryAt;
    dto.sentToSupplierAt = entity.sentToSupplierAt;
    dto.deliveryAddress = entity.deliveryAddress;
    dto.paymentTerms = entity.paymentTerms;
    dto.notes = entity.notes;
    dto.canceledAt = entity.canceledAt;
    dto.cancelReason = entity.cancelReason;

    if (entity.items) {
      dto.items = entity.items.map(PurchaseOrderItemResponseDto.fromEntity);
    }

    return dto;
  }
}

export class ItemBalanceResponseDto {
  @ApiProperty({ format: 'uuid' })
  itemId: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  unit: string;

  @ApiProperty({ example: '10.000' })
  orderedQuantity: string;

  @ApiProperty({ example: '4.000' })
  receivedQuantity: string;

  @ApiProperty({ example: '6.000', description: 'Ainda falta receber.' })
  pendingQuantity: string;

  static fromBalance(this: void, balance: ItemBalance): ItemBalanceResponseDto {
    const dto = new ItemBalanceResponseDto();

    dto.itemId = balance.itemId;
    dto.description = balance.description;
    dto.unit = balance.unit;
    dto.orderedQuantity = balance.orderedQuantity;
    dto.receivedQuantity = balance.receivedQuantity;
    dto.pendingQuantity = balance.pendingQuantity;

    return dto;
  }
}
