import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PayableReleaseReason, PayableStatus } from 'generated/prisma/enums';
import { PayableEntity } from '../domain/payable.entity';

export class PayableResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  invoiceId: string | null;

  @ApiProperty({ format: 'uuid' })
  supplierId: string;

  @ApiProperty({ example: '2500000' })
  amountCents: string;

  @ApiProperty({ example: 'BRL' })
  currency: string;

  @ApiProperty()
  dueDate: Date;

  @ApiProperty({ enum: ['BLOCKED', 'RELEASED', 'PAID', 'CANCELED'] })
  status: PayableStatus;

  @ApiPropertyOptional({
    nullable: true,
    enum: ['MATCHED', 'NO_INVOICE_REQUIRED'],
  })
  releaseReason: PayableReleaseReason | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  releaseNote: string | null;

  @ApiPropertyOptional({ nullable: true, type: Date })
  paidAt: Date | null;

  static fromEntity(this: void, entity: PayableEntity): PayableResponseDto {
    const dto = new PayableResponseDto();

    dto.id = entity.id;
    dto.invoiceId = entity.invoiceId;
    dto.supplierId = entity.supplierId;
    dto.amountCents = entity.amountCents.toString();
    dto.currency = entity.currency;
    dto.dueDate = entity.dueDate;
    dto.status = entity.status;
    dto.releaseReason = entity.releaseReason;
    dto.releaseNote = entity.releaseNote;
    dto.paidAt = entity.paidAt;

    return dto;
  }
}
