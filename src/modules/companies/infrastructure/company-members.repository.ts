import { Injectable } from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { CompanyMemberRole } from 'generated/prisma/enums';
import { PrismaService } from 'src/shared/infrastructure/database/prisma.service';
import { LastAdminError } from '../domain/companies.errors';
import { CompanyMemberEntity } from '../domain/company-member.entity';
import {
  CreateCompanyMemberData,
  ICompanyMemberRepository,
  SubstituteData,
} from '../domain/company-members.repository.interface';
import { CompanyMemberMapper } from './mappers/company-member.mapper';

@Injectable()
export class CompanyMemberRepository implements ICompanyMemberRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateCompanyMemberData): Promise<CompanyMemberEntity> {
    const raw = await this.prisma.companyMember.create({
      data: {
        user_id: data.userId,
        company_id: data.companyId,
        role: data.role,
        approval_limit_cents: data.approvalLimitCents ?? 0n,
        default_cost_center_id: data.defaultCostCenterId,
        manager_id: data.managerId,
      },
    });

    return CompanyMemberMapper.toDomain(raw);
  }

  async findById(id: string): Promise<CompanyMemberEntity | null> {
    const raw = await this.prisma.companyMember.findUnique({
      where: { id },
    });

    return raw ? CompanyMemberMapper.toDomain(raw) : null;
  }

  async findActiveByUser(userId: string): Promise<CompanyMemberEntity | null> {
    const raw = await this.prisma.companyMember.findFirst({
      where: {
        user_id: userId,
        disabled_at: null,
        company: { disabled_at: null },
      },
    });

    return raw ? CompanyMemberMapper.toDomain(raw) : null;
  }

  async list(companyId: string): Promise<CompanyMemberEntity[]> {
    const records = await this.prisma.companyMember.findMany({
      where: {
        company_id: companyId,
        disabled_at: null,
      },
      orderBy: { created_at: 'asc' },
    });

    return records.map(CompanyMemberMapper.toDomain);
  }

  countActiveAdmins(companyId: string): Promise<number> {
    return this.prisma.companyMember.count({
      where: {
        company_id: companyId,
        role: CompanyMemberRole.FINANCE_ADMIN,
        disabled_at: null,
      },
    });
  }

  async updateRole(
    id: string,
    role: CompanyMemberRole,
  ): Promise<CompanyMemberEntity> {
    const raw = await this.prisma.$transaction(async (tx) => {
      const current = await tx.companyMember.findUniqueOrThrow({
        where: { id },
        select: { company_id: true, role: true },
      });

      const losingAdmin =
        current.role === CompanyMemberRole.FINANCE_ADMIN &&
        role !== CompanyMemberRole.FINANCE_ADMIN;

      if (losingAdmin) {
        await this.lockActiveAdmins(tx, current.company_id);

        const remaining = await tx.companyMember.count({
          where: {
            company_id: current.company_id,
            role: CompanyMemberRole.FINANCE_ADMIN,
            disabled_at: null,
            id: { not: id },
          },
        });

        if (remaining === 0) {
          throw new LastAdminError();
        }
      }

      return tx.companyMember.update({ where: { id }, data: { role } });
    });

    return CompanyMemberMapper.toDomain(raw);
  }

  private lockActiveAdmins(
    tx: Prisma.TransactionClient,
    companyId: string,
  ): Promise<unknown> {
    return tx.$queryRaw`
      SELECT id FROM company_members
      WHERE company_id = ${companyId}
        AND role = 'FINANCE_ADMIN'
        AND disabled_at IS NULL
      FOR UPDATE
    `;
  }

  async updateApprovalLimit(
    id: string,
    limitCents: bigint,
  ): Promise<CompanyMemberEntity> {
    const raw = await this.prisma.companyMember.update({
      where: { id },
      data: { approval_limit_cents: limitCents },
    });

    return CompanyMemberMapper.toDomain(raw);
  }

  async updateManager(
    id: string,
    managerId: string | null,
  ): Promise<CompanyMemberEntity> {
    const raw = await this.prisma.companyMember.update({
      where: { id },
      data: { manager_id: managerId },
    });

    return CompanyMemberMapper.toDomain(raw);
  }

  async updateSubstitute(
    id: string,
    data: SubstituteData,
  ): Promise<CompanyMemberEntity> {
    const raw = await this.prisma.companyMember.update({
      where: { id },
      data: {
        substitute_id: data.substituteId,
        absent_from: data.absentFrom,
        absent_until: data.absentUntil,
      },
    });

    return CompanyMemberMapper.toDomain(raw);
  }

  async disable(id: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const current = await tx.companyMember.findUniqueOrThrow({
        where: { id },
        select: { company_id: true, role: true },
      });

      if (current.role === CompanyMemberRole.FINANCE_ADMIN) {
        await this.lockActiveAdmins(tx, current.company_id);

        const remaining = await tx.companyMember.count({
          where: {
            company_id: current.company_id,
            role: CompanyMemberRole.FINANCE_ADMIN,
            disabled_at: null,
            id: { not: id },
          },
        });

        if (remaining === 0) {
          throw new LastAdminError();
        }
      }

      await tx.companyMember.update({
        where: { id },
        data: { disabled_at: new Date() },
      });
    });
  }
}
