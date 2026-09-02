import { Injectable } from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { Page } from 'src/shared/dto/pagination-query.dto';
import { PrismaService } from 'src/shared/infrastructure/database/prisma.service';
import {
  IOrganizationReader,
  ListOrganizationsFilter,
  OrganizationRecord,
} from '../domain/organization.reader';
import { OrganizationMapper } from './mappers/organization.mapper';

@Injectable()
export class OrganizationReader implements IOrganizationReader {
  constructor(private readonly prisma: PrismaService) {}

  async findById(companyId: string): Promise<OrganizationRecord | null> {
    const record = await this.prisma.company.findUnique({
      where: { id: companyId },
    });

    return record ? OrganizationMapper.toDomain(record) : null;
  }

  async list(
    filter: ListOrganizationsFilter,
  ): Promise<Page<OrganizationRecord>> {
    const where: Prisma.CompanyWhereInput = filter.search
      ? {
          OR: [
            { legal_name: { contains: filter.search, mode: 'insensitive' } },
            { trade_name: { contains: filter.search, mode: 'insensitive' } },
            { cnpj: { contains: filter.search.replace(/\D/g, '') } },
          ],
        }
      : {};

    const [records, total] = await Promise.all([
      this.prisma.company.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip: filter.skip,
        take: filter.take,
      }),
      this.prisma.company.count({ where }),
    ]);

    return {
      items: records.map(OrganizationMapper.toDomain),
      total,
      page: Math.floor(filter.skip / filter.take) + 1,
      perPage: filter.take,
    };
  }
}
