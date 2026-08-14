import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DivergenceKind, MatchStatus } from 'generated/prisma/enums';
import {
  MatchDivergenceEntity,
  MatchResultEntity,
} from '../domain/match-result.entity';

export class MatchDivergenceResponseDto {
  @ApiProperty({
    enum: [
      'PRICE_ABOVE_ORDER',
      'QUANTITY_ABOVE_RECEIVED',
      'QUANTITY_ABOVE_ORDER',
      'ITEM_NOT_IN_ORDER',
      'ITEM_NOT_INVOICED',
      'SUPPLIER_MISMATCH',
      'TOTAL_MISMATCH',
    ],
  })
  kind: DivergenceKind;

  @ApiProperty()
  expectedValue: string;

  @ApiProperty()
  actualValue: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  differenceCents: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  differencePercent: string | null;

  static fromEntity(
    this: void,
    entity: MatchDivergenceEntity,
  ): MatchDivergenceResponseDto {
    const dto = new MatchDivergenceResponseDto();

    dto.kind = entity.kind;
    dto.expectedValue = entity.expectedValue;
    dto.actualValue = entity.actualValue;
    dto.differenceCents = entity.differenceCents?.toString() ?? null;
    dto.differencePercent = entity.differencePercent;

    return dto;
  }
}

export class MatchResultResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  purchaseOrderId: string;

  @ApiProperty({ format: 'uuid' })
  invoiceId: string;

  @ApiProperty({ enum: ['MATCHED', 'DIVERGENT', 'OVERRIDDEN', 'REJECTED'] })
  status: MatchStatus;

  @ApiProperty()
  checkedAt: Date;

  @ApiProperty({ example: '2.00' })
  priceTolerancePercent: string;

  @ApiProperty({ example: '0.00' })
  quantityTolerancePercent: string;

  @ApiProperty({ example: '2500000' })
  orderedAmountCents: string;

  @ApiProperty({ example: '2500000' })
  receivedAmountCents: string;

  @ApiProperty({ example: '2500000' })
  invoicedAmountCents: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  resolutionNote: string | null;

  @ApiPropertyOptional({ type: [MatchDivergenceResponseDto] })
  divergences?: MatchDivergenceResponseDto[];

  static fromEntity(
    this: void,
    entity: MatchResultEntity,
  ): MatchResultResponseDto {
    const dto = new MatchResultResponseDto();

    dto.id = entity.id;
    dto.purchaseOrderId = entity.purchaseOrderId;
    dto.invoiceId = entity.invoiceId;
    dto.status = entity.status;
    dto.checkedAt = entity.checkedAt;
    dto.priceTolerancePercent = entity.priceTolerancePercent;
    dto.quantityTolerancePercent = entity.quantityTolerancePercent;
    dto.orderedAmountCents = entity.orderedAmountCents.toString();
    dto.receivedAmountCents = entity.receivedAmountCents.toString();
    dto.invoicedAmountCents = entity.invoicedAmountCents.toString();
    dto.resolutionNote = entity.resolutionNote;

    if (entity.divergences) {
      dto.divergences = entity.divergences.map(
        MatchDivergenceResponseDto.fromEntity,
      );
    }

    return dto;
  }
}
