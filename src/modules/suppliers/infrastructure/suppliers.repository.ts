import { Injectable } from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { ValidationStatus } from 'generated/prisma/enums';
import { Page } from 'src/shared/dto/pagination-query.dto';
import { TransactionContext } from 'src/shared/domain/transaction.manager';
import { prismaClient } from 'src/shared/infrastructure/database/prisma-transaction.manager';
import { PrismaService } from 'src/shared/infrastructure/database/prisma.service';
import { SupplierEntity } from '../domain/supplier.entity';
import {
  CreateSupplierData,
  ISupplierRepository,
  ListSuppliersFilter,
  RefreshSupplierValidationData,
  UpdateSupplierData,
} from '../domain/suppliers.repository.interface';
import { SupplierMapper } from './mappers/supplier.mapper';

function searchConditions(search: string): Prisma.SupplierWhereInput[] {
  const conditions: Prisma.SupplierWhereInput[] = [
    { legal_name: { contains: search, mode: 'insensitive' } },
    { trade_name: { contains: search, mode: 'insensitive' } },
  ];

  const digits = search.replace(/\D/g, '');

  if (digits.length > 0) {
    conditions.push({ cnpj: { contains: digits } });
  }

  return conditions;
}

@Injectable()
export class SupplierRepository implements ISupplierRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: CreateSupplierData,
    context?: TransactionContext,
  ): Promise<SupplierEntity> {
    const raw = await prismaClient(this.prisma, context).supplier.create({
      data: {
        company_id: data.companyId,
        cnpj: data.cnpj,
        legal_name: data.legalName,
        trade_name: data.tradeName ?? null,
        registration_status: data.registrationStatus,
        validation_status: data.validationStatus,
        street: data.street ?? null,
        city: data.city ?? null,
        state: data.state ?? null,
        zip_code: data.zipCode ?? null,
        email: data.email ?? null,
        phone: data.phone ?? null,
        validated_at: data.validatedAt,
      },
    });

    return SupplierMapper.toDomain(raw);
  }

  async findById(
    id: string,
    context?: TransactionContext,
  ): Promise<SupplierEntity | null> {
    const raw = await prismaClient(this.prisma, context).supplier.findUnique({
      where: { id },
    });

    return raw ? SupplierMapper.toDomain(raw) : null;
  }

  async findByCnpj(
    companyId: string,
    cnpj: string,
    context?: TransactionContext,
  ): Promise<SupplierEntity | null> {
    const raw = await prismaClient(this.prisma, context).supplier.findUnique({
      where: { company_id_cnpj: { company_id: companyId, cnpj } },
    });

    return raw ? SupplierMapper.toDomain(raw) : null;
  }

  async list(
    companyId: string,
    filter: ListSuppliersFilter,
  ): Promise<Page<SupplierEntity>> {
    const where: Prisma.SupplierWhereInput = {
      company_id: companyId,
      registration_status: filter.registrationStatus,
      validation_status: filter.validationStatus,
      blocked: filter.blocked,
      ...(filter.search ? { OR: searchConditions(filter.search) } : {}),
    };

    const [records, total] = await Promise.all([
      this.prisma.supplier.findMany({
        where,
        orderBy: { legal_name: 'asc' },
        skip: filter.skip,
        take: filter.take,
      }),
      this.prisma.supplier.count({ where }),
    ]);

    return {
      items: records.map(SupplierMapper.toDomain),
      total,
      page: Math.floor(filter.skip / filter.take) + 1,
      perPage: filter.take,
    };
  }

  async listStaleValidations(
    olderThan: Date,
    limit: number,
  ): Promise<SupplierEntity[]> {
    const records = await this.prisma.supplier.findMany({
      where: {
        blocked: false,
        OR: [
          { validated_at: null },
          { validated_at: { lt: olderThan } },
          { validation_status: { not: ValidationStatus.VALIDATED } },
        ],
      },
      orderBy: { validated_at: { sort: 'asc', nulls: 'first' } },
      take: limit,
    });

    return records.map(SupplierMapper.toDomain);
  }

  async update(
    id: string,
    data: UpdateSupplierData,
    context?: TransactionContext,
  ): Promise<SupplierEntity> {
    const raw = await prismaClient(this.prisma, context).supplier.update({
      where: { id },
      data: {
        legal_name: data.legalName,
        trade_name: data.tradeName,
        street: data.street,
        city: data.city,
        state: data.state,
        zip_code: data.zipCode,
        email: data.email,
        phone: data.phone,
      },
    });

    return SupplierMapper.toDomain(raw);
  }

  async refreshValidation(
    id: string,
    data: RefreshSupplierValidationData,
    context?: TransactionContext,
  ): Promise<SupplierEntity> {
    const raw = await prismaClient(this.prisma, context).supplier.update({
      where: { id },
      data: {
        legal_name: data.legalName,
        trade_name: data.tradeName,
        registration_status: data.registrationStatus,
        validation_status: data.validationStatus,
        validated_at: data.validatedAt,
        street: data.street,
        city: data.city,
        state: data.state,
        zip_code: data.zipCode,
        email: data.email,
        phone: data.phone,
      },
    });

    return SupplierMapper.toDomain(raw);
  }

  async setBlocked(
    id: string,
    blocked: boolean,
    context?: TransactionContext,
  ): Promise<SupplierEntity> {
    const raw = await prismaClient(this.prisma, context).supplier.update({
      where: { id },
      data: { blocked },
    });

    return SupplierMapper.toDomain(raw);
  }
}
