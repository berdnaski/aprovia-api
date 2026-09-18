import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  InvoiceParseStatus,
  ServiceInvoiceStatus,
  WithholdingKind,
} from 'generated/prisma/enums';
import {
  ServiceInvoiceEntity,
  ServiceInvoiceWithholdingEntity,
} from '../domain/service-invoice.entity';

export class ServiceInvoiceWithholdingResponseDto {
  @ApiProperty({ enum: ['IRRF', 'INSS', 'PIS', 'COFINS', 'CSLL', 'ISS_RETIDO'] })
  kind: WithholdingKind;

  @ApiProperty({ example: '500000' })
  baseCents: string;

  @ApiProperty({ example: '1.50' })
  rate: string;

  @ApiProperty({ example: '7500' })
  amountCents: string;

  static fromEntity(
    this: void,
    entity: ServiceInvoiceWithholdingEntity,
  ): ServiceInvoiceWithholdingResponseDto {
    const dto = new ServiceInvoiceWithholdingResponseDto();

    dto.kind = entity.kind;
    dto.baseCents = entity.baseCents.toString();
    dto.rate = entity.rate;
    dto.amountCents = entity.amountCents.toString();

    return dto;
  }
}

export class ServiceInvoiceResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  supplierId: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  payableId: string | null;

  @ApiProperty({ description: 'Chave de acesso de 50 posições (NFS-e Nacional).' })
  accessKey: string;

  @ApiProperty({ example: '1234' })
  number: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  verificationCode: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  municipalityCode: string | null;

  @ApiProperty()
  issuedAt: Date;

  @ApiProperty({ example: '12345678000199' })
  issuerCnpj: string;

  @ApiProperty()
  issuerName: string;

  @ApiProperty({ example: '12345678000199' })
  recipientCnpj: string;

  @ApiProperty()
  serviceDescription: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  serviceCode: string | null;

  @ApiProperty({ example: '500000', description: 'Valor bruto do serviço.' })
  grossAmountCents: string;

  @ApiProperty({ example: '0' })
  discountCents: string;

  @ApiPropertyOptional({ nullable: true, type: String, example: '5.00' })
  issRate: string | null;

  @ApiProperty({ example: '25000' })
  issAmountCents: string;

  @ApiProperty()
  issWithheld: boolean;

  @ApiProperty({
    example: '460000',
    description: 'Valor líquido: bruto − descontos − retenções.',
  })
  netAmountCents: string;

  @ApiProperty({ enum: ['PENDING', 'PARSED', 'FAILED'] })
  parseStatus: InvoiceParseStatus;

  @ApiProperty({ enum: ['RECEIVED', 'APPROVED', 'REJECTED'] })
  status: ServiceInvoiceStatus;

  @ApiPropertyOptional({ nullable: true, type: String })
  rejectReason: string | null;

  @ApiProperty({
    isArray: true,
    type: String,
    description:
      'Pontos do XML que não puderam ser confirmados automaticamente. Não bloqueiam, mas pedem conferência.',
  })
  integrityWarnings: string[];

  @ApiPropertyOptional({ type: [ServiceInvoiceWithholdingResponseDto] })
  withholdings?: ServiceInvoiceWithholdingResponseDto[];

  static fromEntity(
    this: void,
    entity: ServiceInvoiceEntity,
  ): ServiceInvoiceResponseDto {
    const dto = new ServiceInvoiceResponseDto();

    dto.id = entity.id;
    dto.supplierId = entity.supplierId;
    dto.payableId = entity.payableId;
    dto.accessKey = entity.accessKey;
    dto.number = entity.number;
    dto.verificationCode = entity.verificationCode;
    dto.municipalityCode = entity.municipalityCode;
    dto.issuedAt = entity.issuedAt;
    dto.issuerCnpj = entity.issuerCnpj;
    dto.issuerName = entity.issuerName;
    dto.recipientCnpj = entity.recipientCnpj;
    dto.serviceDescription = entity.serviceDescription;
    dto.serviceCode = entity.serviceCode;
    dto.grossAmountCents = entity.grossAmountCents.toString();
    dto.discountCents = entity.discountCents.toString();
    dto.issRate = entity.issRate;
    dto.issAmountCents = entity.issAmountCents.toString();
    dto.issWithheld = entity.issWithheld;
    dto.netAmountCents = entity.netAmountCents.toString();
    dto.parseStatus = entity.parseStatus;
    dto.status = entity.status;
    dto.rejectReason = entity.rejectReason;
    dto.integrityWarnings = entity.integrityWarnings;

    if (entity.withholdings) {
      dto.withholdings = entity.withholdings.map(
        ServiceInvoiceWithholdingResponseDto.fromEntity,
      );
    }

    return dto;
  }
}
