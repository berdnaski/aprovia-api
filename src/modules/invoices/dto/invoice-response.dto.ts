import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InvoiceParseStatus, InvoiceStatus, TaxKind } from 'generated/prisma/enums';
import {
  InvoiceEntity,
  InvoiceItemEntity,
  InvoiceTaxEntity,
} from '../domain/invoice.entity';

export class InvoiceItemResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  sequence: number;

  @ApiProperty()
  description: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  ncm: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  cfop: string | null;

  @ApiProperty({ example: '2.0000' })
  quantity: string;

  @ApiProperty()
  unit: string;

  @ApiProperty({ example: '250000' })
  unitPriceCents: string;

  @ApiProperty({ example: '500000' })
  totalCents: string;

  static fromEntity(
    this: void,
    entity: InvoiceItemEntity,
  ): InvoiceItemResponseDto {
    const dto = new InvoiceItemResponseDto();

    dto.id = entity.id;
    dto.sequence = entity.sequence;
    dto.description = entity.description;
    dto.ncm = entity.ncm;
    dto.cfop = entity.cfop;
    dto.quantity = entity.quantity;
    dto.unit = entity.unit;
    dto.unitPriceCents = entity.unitPriceCents.toString();
    dto.totalCents = entity.totalCents.toString();

    return dto;
  }
}

export class InvoiceTaxResponseDto {
  @ApiProperty({
    enum: ['ICMS', 'IPI', 'PIS', 'COFINS', 'ISS', 'IRRF', 'CSLL', 'INSS'],
  })
  kind: TaxKind;

  @ApiProperty({ example: '500000' })
  baseCents: string;

  @ApiProperty({ example: '18.00' })
  rate: string;

  @ApiProperty({ example: '90000' })
  amountCents: string;

  static fromEntity(
    this: void,
    entity: InvoiceTaxEntity,
  ): InvoiceTaxResponseDto {
    const dto = new InvoiceTaxResponseDto();

    dto.kind = entity.kind;
    dto.baseCents = entity.baseCents.toString();
    dto.rate = entity.rate;
    dto.amountCents = entity.amountCents.toString();

    return dto;
  }
}

export class InvoiceResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  purchaseOrderId: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  supplierId: string | null;

  @ApiProperty({ example: '35260812345678000199550010000012345123456789' })
  accessKey: string;

  @ApiProperty({ example: '1234' })
  number: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  series: string | null;

  @ApiProperty()
  issuedAt: Date;

  @ApiProperty({ example: '12345678000199' })
  issuerCnpj: string;

  @ApiProperty()
  issuerName: string;

  @ApiProperty({ example: '500000' })
  totalAmountCents: string;

  @ApiProperty({ enum: ['PENDING', 'PARSED', 'FAILED'] })
  parseStatus: InvoiceParseStatus;

  @ApiProperty({
    enum: ['RECEIVED', 'MATCHED', 'DIVERGENT', 'APPROVED', 'REJECTED'],
  })
  status: InvoiceStatus;

  @ApiPropertyOptional({ nullable: true, type: String })
  rejectReason: string | null;

  @ApiPropertyOptional({ type: [InvoiceItemResponseDto] })
  items?: InvoiceItemResponseDto[];

  @ApiPropertyOptional({ type: [InvoiceTaxResponseDto] })
  taxes?: InvoiceTaxResponseDto[];

  static fromEntity(this: void, entity: InvoiceEntity): InvoiceResponseDto {
    const dto = new InvoiceResponseDto();

    dto.id = entity.id;
    dto.purchaseOrderId = entity.purchaseOrderId;
    dto.supplierId = entity.supplierId;
    dto.accessKey = entity.accessKey;
    dto.number = entity.number;
    dto.series = entity.series;
    dto.issuedAt = entity.issuedAt;
    dto.issuerCnpj = entity.issuerCnpj;
    dto.issuerName = entity.issuerName;
    dto.totalAmountCents = entity.totalAmountCents.toString();
    dto.parseStatus = entity.parseStatus;
    dto.status = entity.status;
    dto.rejectReason = entity.rejectReason;

    if (entity.items) {
      dto.items = entity.items.map(InvoiceItemResponseDto.fromEntity);
    }

    if (entity.taxes) {
      dto.taxes = entity.taxes.map(InvoiceTaxResponseDto.fromEntity);
    }

    return dto;
  }
}
