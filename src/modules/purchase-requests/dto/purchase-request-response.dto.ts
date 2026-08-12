import { ApiProperty } from '@nestjs/swagger';
import { RequestStatus, Urgency } from 'generated/prisma/enums';
import { PurchaseRequestEntity } from '../domain/purchase-request.entity';
import { RequestItemEntity } from '../domain/request-item.entity';
import { RequestFileEntity } from '../domain/request-file.entity';
import {
  ExtractedFields,
  ExtractionResult,
  ExtractionStatus,
} from '../domain/extraction.service';

export class PurchaseRequestResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({
    example: 'REQ-2026-0042',
    description: 'Identificador legível.',
  })
  number: string;

  @ApiProperty({ format: 'uuid' })
  requesterId: string;

  @ApiProperty({ format: 'uuid' })
  costCenterId: string;

  @ApiProperty({ format: 'uuid', nullable: true, type: String })
  categoryId: string | null;

  @ApiProperty({ format: 'uuid', nullable: true, type: String })
  supplierId: string | null;

  @ApiProperty()
  title: string;

  @ApiProperty({ nullable: true, type: String })
  description: string | null;

  @ApiProperty({
    example: '8500000',
    description: 'Soma dos itens, em centavos.',
  })
  totalAmountCents: string;

  @ApiProperty({ enum: ['LOW', 'MEDIUM', 'HIGH'] })
  urgency: Urgency;

  @ApiProperty({
    enum: [
      'DRAFT',
      'PENDING',
      'CHANGES_REQUESTED',
      'APPROVED',
      'REJECTED',
      'CANCELED',
      'COMPLETED',
    ],
  })
  status: RequestStatus;

  @ApiProperty({ nullable: true, type: String })
  paymentTerms: string | null;

  @ApiProperty({
    description: 'Rascunho (RN37): não consome saldo nem notifica.',
  })
  createdAt: Date;

  @ApiProperty({ nullable: true, type: Date, description: 'Marco do SLA.' })
  submittedAt: Date | null;

  @ApiProperty({ nullable: true, type: Date })
  finalizedAt: Date | null;

  static fromEntity(
    this: void,
    entity: PurchaseRequestEntity,
  ): PurchaseRequestResponseDto {
    const dto = new PurchaseRequestResponseDto();

    dto.id = entity.id;
    dto.number = entity.number;
    dto.requesterId = entity.requesterId;
    dto.costCenterId = entity.costCenterId;
    dto.categoryId = entity.categoryId;
    dto.supplierId = entity.supplierId;
    dto.title = entity.title;
    dto.description = entity.description;
    dto.totalAmountCents = entity.totalAmountCents.toString();
    dto.urgency = entity.urgency;
    dto.status = entity.status;
    dto.paymentTerms = entity.paymentTerms;
    dto.createdAt = entity.createdAt;
    dto.submittedAt = entity.submittedAt;
    dto.finalizedAt = entity.finalizedAt;

    return dto;
  }
}

export class RequestItemResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  description: string;

  @ApiProperty({ example: '10.000' })
  quantity: string;

  @ApiProperty({ example: 'un' })
  unit: string;

  @ApiProperty({ example: '850000' })
  unitPriceCents: string;

  @ApiProperty({ example: '8500000' })
  totalCents: string;

  static fromEntity(entity: RequestItemEntity): RequestItemResponseDto {
    const dto = new RequestItemResponseDto();

    dto.id = entity.id;
    dto.description = entity.description;
    dto.quantity = entity.quantity;
    dto.unit = entity.unit;
    dto.unitPriceCents = entity.unitPriceCents.toString();
    dto.totalCents = entity.totalCents.toString();

    return dto;
  }

  static fromEntities(entities: RequestItemEntity[]): RequestItemResponseDto[] {
    return entities.map((entity) => RequestItemResponseDto.fromEntity(entity));
  }
}

export class RequestFileResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  fileName: string;

  @ApiProperty({
    example: 'application/pdf',
    description: 'Detectado por magic bytes.',
  })
  mimeType: string;

  @ApiProperty({ example: '284512' })
  sizeBytes: string;

  @ApiProperty()
  uploadedAt: Date;

  static fromEntity(entity: RequestFileEntity): RequestFileResponseDto {
    const dto = new RequestFileResponseDto();

    dto.id = entity.id;
    dto.fileName = entity.fileName;
    dto.mimeType = entity.mimeType;
    dto.sizeBytes = entity.sizeBytes.toString();
    dto.uploadedAt = entity.uploadedAt;

    return dto;
  }

  static fromEntities(entities: RequestFileEntity[]): RequestFileResponseDto[] {
    return entities.map((entity) => RequestFileResponseDto.fromEntity(entity));
  }
}

export class ExtractionResponseDto {
  @ApiProperty({ enum: ['QUEUED', 'SUCCEEDED', 'FAILED'] })
  status: ExtractionStatus;

  @ApiProperty({
    nullable: true,
    type: Object,
    description:
      'Sugestões para pré-preencher campos editáveis. Nada é gravado sem confirmação do solicitante (RN42, RNF16).',
  })
  fields: ExtractedFields | null;

  @ApiProperty({ nullable: true, type: String })
  failureReason: string | null;

  static fromResult(result: ExtractionResult): ExtractionResponseDto {
    const dto = new ExtractionResponseDto();

    dto.status = result.status;
    dto.fields = result.fields;
    dto.failureReason = result.failureReason;

    return dto;
  }
}

export class DownloadUrlResponseDto {
  @ApiProperty({ description: 'URL assinada e temporária.' })
  url: string;

  @ApiProperty({ example: 900, description: 'Validade em segundos.' })
  expiresInSeconds: number;
}
