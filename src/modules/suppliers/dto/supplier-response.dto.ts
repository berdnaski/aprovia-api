import { ApiProperty } from '@nestjs/swagger';
import { RegistrationStatus, ValidationStatus } from 'generated/prisma/enums';
import { formatCnpj } from 'src/shared/domain/cnpj';
import { SupplierEntity } from '../domain/supplier.entity';
import {
  SupplierEligibility,
  SupplierUsage,
} from '../domain/services/supplier-eligibility.service';

export class SupplierResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: '12.345.678/0001-99' })
  cnpj: string;

  @ApiProperty({ example: 'Acme Indústria LTDA' })
  legalName: string;

  @ApiProperty({ example: 'Acme', nullable: true, type: String })
  tradeName: string | null;

  @ApiProperty({
    enum: ['ACTIVE', 'CLOSED', 'INACTIVE', 'SUSPENDED', 'VOID', 'UNKNOWN'],
    description: 'Situação cadastral na Receita Federal.',
  })
  registrationStatus: RegistrationStatus;

  @ApiProperty({
    enum: ['VALIDATED', 'PENDING', 'FAILED'],
    description: 'Se a consulta ao serviço público teve sucesso.',
  })
  validationStatus: ValidationStatus;

  @ApiProperty({ nullable: true, type: String })
  street: string | null;

  @ApiProperty({ nullable: true, type: String })
  city: string | null;

  @ApiProperty({ nullable: true, type: String })
  state: string | null;

  @ApiProperty({ nullable: true, type: String })
  zipCode: string | null;

  @ApiProperty({ nullable: true, type: String })
  email: string | null;

  @ApiProperty({ nullable: true, type: String })
  phone: string | null;

  @ApiProperty({
    nullable: true,
    type: Date,
    description: 'Alimenta a revalidação periódica (RF42).',
  })
  validatedAt: Date | null;

  @ApiProperty({ description: 'Decisão comercial, independente da Receita.' })
  blocked: boolean;

  @ApiProperty({
    enum: ['ALLOWED', 'BLOCKS_SUBMISSION', 'BLOCKS_APPROVAL'],
    description:
      'BLOCKS_SUBMISSION impede submeter pedido (RN34). BLOCKS_APPROVAL permite criar, mas exige validação antes da aprovação final (RN35).',
  })
  usage: SupplierUsage;

  @ApiProperty({ nullable: true, type: String })
  usageReason: string | null;

  @ApiProperty()
  createdAt: Date;

  static fromEntity(
    entity: SupplierEntity,
    eligibility: SupplierEligibility,
  ): SupplierResponseDto {
    const dto = new SupplierResponseDto();

    dto.id = entity.id;
    dto.cnpj = formatCnpj(entity.cnpj);
    dto.legalName = entity.legalName;
    dto.tradeName = entity.tradeName;
    dto.registrationStatus = entity.registrationStatus;
    dto.validationStatus = entity.validationStatus;
    dto.street = entity.street;
    dto.city = entity.city;
    dto.state = entity.state;
    dto.zipCode = entity.zipCode;
    dto.email = entity.email;
    dto.phone = entity.phone;
    dto.validatedAt = entity.validatedAt;
    dto.blocked = entity.blocked;
    dto.usage = eligibility.usage;
    dto.usageReason = eligibility.reason;
    dto.createdAt = entity.createdAt;

    return dto;
  }
}
