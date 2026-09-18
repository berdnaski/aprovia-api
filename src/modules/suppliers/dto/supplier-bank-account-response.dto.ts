import { ApiProperty } from '@nestjs/swagger';
import {
  BankAccountStatus,
  BankAccountType,
  PixKeyType,
} from 'generated/prisma/enums';
import { formatCnpj } from 'src/shared/domain/cnpj';
import { formatCpf } from 'src/shared/domain/cpf';
import { SupplierBankAccountEntity } from '../domain/supplier-bank-account.entity';

function formatDocument(value: string): string {
  return value.length === 14 ? formatCnpj(value) : formatCpf(value);
}

export class SupplierBankAccountResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  bankCode: string;

  @ApiProperty()
  branch: string;

  @ApiProperty()
  accountNumber: string;

  @ApiProperty({ nullable: true, type: String })
  accountDigit: string | null;

  @ApiProperty({ enum: BankAccountType })
  accountType: BankAccountType;

  @ApiProperty()
  holderName: string;

  @ApiProperty()
  holderDocument: string;

  @ApiProperty({ enum: PixKeyType, nullable: true, type: String })
  pixKeyType: PixKeyType | null;

  @ApiProperty({ nullable: true, type: String })
  pixKey: string | null;

  @ApiProperty()
  thirdParty: boolean;

  @ApiProperty({ nullable: true, type: String })
  justification: string | null;

  @ApiProperty({ enum: BankAccountStatus })
  status: BankAccountStatus;

  @ApiProperty({ format: 'uuid' })
  requestedById: string;

  @ApiProperty()
  requestedAt: Date;

  @ApiProperty({ format: 'uuid', nullable: true, type: String })
  reviewedById: string | null;

  @ApiProperty({ nullable: true, type: Date })
  reviewedAt: Date | null;

  @ApiProperty({ nullable: true, type: String })
  reviewNote: string | null;

  static fromEntity(
    entity: SupplierBankAccountEntity,
  ): SupplierBankAccountResponseDto {
    const dto = new SupplierBankAccountResponseDto();

    dto.id = entity.id;
    dto.bankCode = entity.bankCode;
    dto.branch = entity.branch;
    dto.accountNumber = entity.accountNumber;
    dto.accountDigit = entity.accountDigit;
    dto.accountType = entity.accountType;
    dto.holderName = entity.holderName;
    dto.holderDocument = formatDocument(entity.holderDocument);
    dto.pixKeyType = entity.pixKeyType;
    dto.pixKey = entity.pixKey;
    dto.thirdParty = entity.thirdParty;
    dto.justification = entity.justification;
    dto.status = entity.status;
    dto.requestedById = entity.requestedById;
    dto.requestedAt = entity.requestedAt;
    dto.reviewedById = entity.reviewedById;
    dto.reviewedAt = entity.reviewedAt;
    dto.reviewNote = entity.reviewNote;

    return dto;
  }

  static fromEntities(
    entities: SupplierBankAccountEntity[],
  ): SupplierBankAccountResponseDto[] {
    return entities.map((entity) =>
      SupplierBankAccountResponseDto.fromEntity(entity),
    );
  }
}
