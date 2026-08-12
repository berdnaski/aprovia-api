import { Injectable } from '@nestjs/common';
import { CompanyMemberRole } from 'generated/prisma/enums';
import { TransactionContext } from 'src/shared/domain/transaction.manager';
import { prismaClient } from 'src/shared/infrastructure/database/prisma-transaction.manager';
import { PrismaService } from 'src/shared/infrastructure/database/prisma.service';
import { CompanyMemberEntity } from '../domain/company-member.entity';
import {
  CountActiveAdminsOptions,
  CreateCompanyMemberData,
  ICompanyMemberRepository,
  SubstituteData,
} from '../domain/company-members.repository.interface';
import { CompanyMemberMapper } from './mappers/company-member.mapper';

@Injectable()
export class CompanyMemberRepository implements ICompanyMemberRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: CreateCompanyMemberData,
    context?: TransactionContext,
  ): Promise<CompanyMemberEntity> {
    const raw = await prismaClient(this.prisma, context).companyMember.create({
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

  async findById(
    id: string,
    context?: TransactionContext,
  ): Promise<CompanyMemberEntity | null> {
    const raw = await prismaClient(
      this.prisma,
      context,
    ).companyMember.findUnique({ where: { id } });

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

  countActiveAdmins(
    companyId: string,
    options?: CountActiveAdminsOptions,
    context?: TransactionContext,
  ): Promise<number> {
    return prismaClient(this.prisma, context).companyMember.count({
      where: {
        company_id: companyId,
        role: CompanyMemberRole.FINANCE_ADMIN,
        disabled_at: null,
        id: options?.excludeMemberId
          ? { not: options.excludeMemberId }
          : undefined,
      },
    });
  }

  async lockActiveAdmins(
    companyId: string,
    context: TransactionContext,
  ): Promise<void> {
    await prismaClient(this.prisma, context).$queryRaw`
      SELECT id FROM company_members
      WHERE company_id = ${companyId}
        AND role = 'FINANCE_ADMIN'
        AND disabled_at IS NULL
      FOR UPDATE
    `;
  }

  async listSubordinates(
    managerId: string,
    context?: TransactionContext,
  ): Promise<CompanyMemberEntity[]> {
    const records = await prismaClient(
      this.prisma,
      context,
    ).companyMember.findMany({
      where: { manager_id: managerId, disabled_at: null },
    });

    return records.map(CompanyMemberMapper.toDomain);
  }

  async listSubstitutedBy(
    substituteId: string,
    context?: TransactionContext,
  ): Promise<CompanyMemberEntity[]> {
    const records = await prismaClient(
      this.prisma,
      context,
    ).companyMember.findMany({
      where: { substitute_id: substituteId, disabled_at: null },
    });

    return records.map(CompanyMemberMapper.toDomain);
  }

  async reassignSubordinates(
    managerId: string,
    newManagerId: string | null,
    context?: TransactionContext,
  ): Promise<void> {
    await prismaClient(this.prisma, context).companyMember.updateMany({
      where: { manager_id: managerId },
      data: { manager_id: newManagerId },
    });
  }

  async clearSubstituteReferences(
    substituteId: string,
    context?: TransactionContext,
  ): Promise<void> {
    await prismaClient(this.prisma, context).companyMember.updateMany({
      where: { substitute_id: substituteId },
      data: { substitute_id: null, absent_from: null, absent_until: null },
    });
  }

  async updateRole(
    id: string,
    role: CompanyMemberRole,
    context?: TransactionContext,
  ): Promise<CompanyMemberEntity> {
    const raw = await prismaClient(this.prisma, context).companyMember.update({
      where: { id },
      data: { role },
    });

    return CompanyMemberMapper.toDomain(raw);
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
    context?: TransactionContext,
  ): Promise<CompanyMemberEntity> {
    const raw = await prismaClient(this.prisma, context).companyMember.update({
      where: { id },
      data: {
        substitute_id: data.substituteId,
        absent_from: data.absentFrom,
        absent_until: data.absentUntil,
      },
    });

    return CompanyMemberMapper.toDomain(raw);
  }

  async disable(id: string, context?: TransactionContext): Promise<void> {
    await prismaClient(this.prisma, context).companyMember.update({
      where: { id },
      data: { disabled_at: new Date() },
    });
  }
}
