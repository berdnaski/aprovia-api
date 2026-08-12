import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RegistrationStatus } from 'generated/prisma/enums';
import { formatCnpj } from 'src/shared/domain/cnpj';
import { CnpjLookupFailure } from '../domain/cnpj-lookup.provider';
import { CnpjLookupView } from '../application/lookup-cnpj.use-case';

export class CnpjLookupResponseDto {
  @ApiProperty({ example: '12.345.678/0001-99' })
  cnpj: string;

  @ApiProperty({
    description:
      'false quando a consulta falhou. O cadastro segue permitido com preenchimento manual (RNF14).',
  })
  found: boolean;

  @ApiPropertyOptional({
    enum: ['TIMEOUT', 'UNAVAILABLE', 'NOT_FOUND', 'MALFORMED'],
    nullable: true,
  })
  failure: CnpjLookupFailure | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  message: string | null;

  @ApiProperty({
    description:
      'true quando o fornecedor já existe na base da empresa: a API não foi consultada (RF40).',
  })
  alreadyRegistered: boolean;

  @ApiPropertyOptional({ format: 'uuid', nullable: true, type: String })
  supplierId: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  legalName: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  tradeName: string | null;

  @ApiPropertyOptional({
    enum: ['ACTIVE', 'CLOSED', 'INACTIVE', 'SUSPENDED', 'VOID', 'UNKNOWN'],
    nullable: true,
  })
  registrationStatus: RegistrationStatus | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  street: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  city: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  state: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  zipCode: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  email: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  phone: string | null;

  static fromView(view: CnpjLookupView): CnpjLookupResponseDto {
    const dto = new CnpjLookupResponseDto();

    dto.cnpj = formatCnpj(view.cnpj);
    dto.alreadyRegistered = view.existingSupplier !== null;
    dto.supplierId = view.existingSupplier?.id ?? null;

    if (!view.outcome.ok) {
      dto.found = false;
      dto.failure = view.outcome.failure;
      dto.message = view.outcome.message;
      dto.legalName = null;
      dto.tradeName = null;
      dto.registrationStatus = null;
      dto.street = null;
      dto.city = null;
      dto.state = null;
      dto.zipCode = null;
      dto.email = null;
      dto.phone = null;

      return dto;
    }

    const { data } = view.outcome;

    dto.found = true;
    dto.failure = null;
    dto.message = null;
    dto.legalName = data.legalName;
    dto.tradeName = data.tradeName;
    dto.registrationStatus = data.registrationStatus;
    dto.street = data.address.street;
    dto.city = data.address.city;
    dto.state = data.address.state;
    dto.zipCode = data.address.zipCode;
    dto.email = data.email;
    dto.phone = data.phone;

    return dto;
  }
}
