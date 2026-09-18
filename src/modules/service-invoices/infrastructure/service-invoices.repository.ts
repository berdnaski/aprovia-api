import { Injectable } from '@nestjs/common';
import { Prisma, ServiceInvoiceStatus } from 'generated/prisma/client';
import { Page } from 'src/shared/dto/pagination-query.dto';
import { PrismaService } from 'src/shared/infrastructure/database/prisma.service';
import { ServiceInvoiceEntity } from '../domain/service-invoice.entity';
import {
  CreateServiceInvoiceData,
  IServiceInvoiceRepository,
  ListServiceInvoicesFilter,
} from '../domain/service-invoices.repository.interface';
import { ServiceInvoiceMapper } from './mappers/service-invoice.mapper';

const INCLUDE = { withholdings: true } as const;

@Injectable()
export class ServiceInvoiceRepository implements IServiceInvoiceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: CreateServiceInvoiceData,
  ): Promise<ServiceInvoiceEntity> {
    const raw = await this.prisma.serviceInvoice.create({
      data: {
        company_id: data.companyId,
        supplier_id: data.supplierId,
        access_key: data.accessKey,
        number: data.number,
        verification_code: data.verificationCode,
        municipality_code: data.municipalityCode,
        issued_at: data.issuedAt,
        issuer_cnpj: data.issuerCnpj,
        issuer_name: data.issuerName,
        recipient_cnpj: data.recipientCnpj,
        service_description: data.serviceDescription,
        service_code: data.serviceCode,
        gross_amount_cents: data.grossAmountCents,
        discount_cents: data.discountCents,
        iss_rate: data.issRate,
        iss_amount_cents: data.issAmountCents,
        iss_withheld: data.issWithheld,
        net_amount_cents: data.netAmountCents,
        raw_xml: data.rawXml,
        parse_status: data.parseStatus,
        integrity_warnings: data.integrityWarnings,
        uploaded_by_id: data.uploadedById,
        withholdings: {
          create: data.withholdings.map((item) => ({
            kind: item.kind,
            base_cents: item.baseCents,
            rate: item.rate,
            amount_cents: item.amountCents,
          })),
        },
      },
      include: INCLUDE,
    });

    return ServiceInvoiceMapper.toDomain(raw);
  }

  async findById(
    id: string,
    companyId: string,
  ): Promise<ServiceInvoiceEntity | null> {
    const raw = await this.prisma.serviceInvoice.findFirst({
      where: { id, company_id: companyId },
      include: INCLUDE,
    });

    return raw ? ServiceInvoiceMapper.toDomain(raw) : null;
  }

  async findByAccessKey(
    companyId: string,
    accessKey: string,
  ): Promise<ServiceInvoiceEntity | null> {
    const raw = await this.prisma.serviceInvoice.findUnique({
      where: {
        company_id_access_key: {
          company_id: companyId,
          access_key: accessKey,
        },
      },
      include: INCLUDE,
    });

    return raw ? ServiceInvoiceMapper.toDomain(raw) : null;
  }

  async list(
    filter: ListServiceInvoicesFilter,
  ): Promise<Page<ServiceInvoiceEntity>> {
    const where: Prisma.ServiceInvoiceWhereInput = {
      company_id: filter.companyId,
      ...(filter.status?.length && { status: { in: filter.status } }),
      ...(filter.supplierId && { supplier_id: filter.supplierId }),
      ...(filter.search && {
        number: { contains: filter.search, mode: 'insensitive' as const },
      }),
    };

    const [rows, total] = await Promise.all([
      this.prisma.serviceInvoice.findMany({
        where,
        include: INCLUDE,
        omit: { raw_xml: true },
        orderBy: { issued_at: 'desc' },
        skip: filter.skip,
        take: filter.take,
      }),
      this.prisma.serviceInvoice.count({ where }),
    ]);

    return {
      items: rows.map(ServiceInvoiceMapper.toDomain),
      total,
      page: filter.page,
      perPage: filter.perPage,
    };
  }

  async approve(id: string, payableId: string): Promise<ServiceInvoiceEntity> {
    const raw = await this.prisma.serviceInvoice.update({
      where: { id },
      data: { status: ServiceInvoiceStatus.APPROVED, payable_id: payableId },
      include: INCLUDE,
    });

    return ServiceInvoiceMapper.toDomain(raw);
  }

  async reject(
    id: string,
    rejectedById: string,
    reason: string,
  ): Promise<ServiceInvoiceEntity> {
    const raw = await this.prisma.serviceInvoice.update({
      where: { id },
      data: {
        status: ServiceInvoiceStatus.REJECTED,
        rejected_by_id: rejectedById,
        rejected_at: new Date(),
        reject_reason: reason,
      },
      include: INCLUDE,
    });

    return ServiceInvoiceMapper.toDomain(raw);
  }
}
