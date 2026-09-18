import { Injectable } from '@nestjs/common';
import { BankAccountStatus } from 'generated/prisma/enums';
import { PrismaService } from 'src/shared/infrastructure/database/prisma.service';
import { SupplierBankAccountEntity } from '../domain/supplier-bank-account.entity';
import {
  CreateSupplierBankAccountData,
  ISupplierBankAccountRepository,
  ReviewSupplierBankAccountData,
} from '../domain/supplier-bank-accounts.repository.interface';
import { SupplierBankAccountMapper } from './mappers/supplier-bank-account.mapper';

@Injectable()
export class SupplierBankAccountRepository implements ISupplierBankAccountRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: CreateSupplierBankAccountData,
  ): Promise<SupplierBankAccountEntity> {
    const raw = await this.prisma.supplierBankAccount.create({
      data: {
        company_id: data.companyId,
        supplier_id: data.supplierId,
        bank_code: data.bankCode,
        branch: data.branch,
        account_number: data.accountNumber,
        account_digit: data.accountDigit,
        account_type: data.accountType,
        holder_name: data.holderName,
        holder_document: data.holderDocument,
        pix_key_type: data.pixKeyType,
        pix_key: data.pixKey,
        third_party: data.thirdParty,
        justification: data.justification,
        requested_by_id: data.requestedById,
      },
    });

    return SupplierBankAccountMapper.toDomain(raw);
  }

  async findById(id: string): Promise<SupplierBankAccountEntity | null> {
    const raw = await this.prisma.supplierBankAccount.findUnique({
      where: { id },
    });

    return raw ? SupplierBankAccountMapper.toDomain(raw) : null;
  }

  async listBySupplier(
    supplierId: string,
  ): Promise<SupplierBankAccountEntity[]> {
    const records = await this.prisma.supplierBankAccount.findMany({
      where: { supplier_id: supplierId, archived_at: null },
      orderBy: { requested_at: 'desc' },
    });

    return records.map(SupplierBankAccountMapper.toDomain);
  }

  async review(
    id: string,
    data: ReviewSupplierBankAccountData,
  ): Promise<SupplierBankAccountEntity> {
    const raw = await this.prisma.supplierBankAccount.update({
      where: { id },
      data: {
        status: data.status,
        reviewed_by_id: data.reviewedById,
        reviewed_at: new Date(),
        review_note: data.reviewNote,
      },
    });

    return SupplierBankAccountMapper.toDomain(raw);
  }

  async archive(id: string): Promise<SupplierBankAccountEntity> {
    const raw = await this.prisma.supplierBankAccount.update({
      where: { id },
      data: { archived_at: new Date(), status: BankAccountStatus.ARCHIVED },
    });

    return SupplierBankAccountMapper.toDomain(raw);
  }
}
