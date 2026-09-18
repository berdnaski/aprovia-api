import { Injectable } from '@nestjs/common';
import { TransactionContext } from 'src/shared/domain/transaction.manager';
import { prismaClient } from 'src/shared/infrastructure/database/prisma-transaction.manager';
import { PrismaService } from 'src/shared/infrastructure/database/prisma.service';
import { ChartAccountEntity } from '../domain/chart-account.entity';
import { compareAccountCodes } from '../domain/chart-account-code';
import {
  CreateChartAccountData,
  IChartAccountRepository,
  ListChartAccountsFilter,
  UpdateChartAccountData,
} from '../domain/chart-accounts.repository.interface';
import { ChartAccountMapper } from './mappers/chart-account.mapper';

@Injectable()
export class ChartAccountRepository implements IChartAccountRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: CreateChartAccountData,
    context?: TransactionContext,
  ): Promise<ChartAccountEntity> {
    const raw = await prismaClient(this.prisma, context).chartAccount.create({
      data: {
        company_id: data.companyId,
        parent_id: data.parentId,
        code: data.code,
        name: data.name,
        kind: data.kind,
        postable: data.postable,
        external_code: data.externalCode,
      },
    });

    return ChartAccountMapper.toDomain(raw);
  }

  async findById(
    id: string,
    context?: TransactionContext,
  ): Promise<ChartAccountEntity | null> {
    const raw = await prismaClient(
      this.prisma,
      context,
    ).chartAccount.findUnique({ where: { id } });

    return raw ? ChartAccountMapper.toDomain(raw) : null;
  }

  async findByIds(
    companyId: string,
    ids: string[],
    context?: TransactionContext,
  ): Promise<ChartAccountEntity[]> {
    if (ids.length === 0) {
      return [];
    }

    const records = await prismaClient(
      this.prisma,
      context,
    ).chartAccount.findMany({
      where: { company_id: companyId, id: { in: ids } },
    });

    return records.map(ChartAccountMapper.toDomain);
  }

  async list(
    companyId: string,
    filter?: ListChartAccountsFilter,
    context?: TransactionContext,
  ): Promise<ChartAccountEntity[]> {
    const records = await prismaClient(
      this.prisma,
      context,
    ).chartAccount.findMany({
      where: {
        company_id: companyId,
        active: filter?.includeInactive ? undefined : true,
      },
    });

    return records
      .map(ChartAccountMapper.toDomain)
      .sort((left, right) => compareAccountCodes(left.code, right.code));
  }

  async hasChart(
    companyId: string,
    context?: TransactionContext,
  ): Promise<boolean> {
    const account = await prismaClient(
      this.prisma,
      context,
    ).chartAccount.findFirst({
      where: { company_id: companyId, active: true, postable: true },
      select: { id: true },
    });

    return account !== null;
  }

  countActiveChildren(
    id: string,
    context?: TransactionContext,
  ): Promise<number> {
    return prismaClient(this.prisma, context).chartAccount.count({
      where: { parent_id: id, active: true },
    });
  }

  async update(
    id: string,
    data: UpdateChartAccountData,
    context?: TransactionContext,
  ): Promise<ChartAccountEntity> {
    const raw = await prismaClient(this.prisma, context).chartAccount.update({
      where: { id },
      data: {
        name: data.name,
        external_code: data.externalCode,
        postable: data.postable,
      },
    });

    return ChartAccountMapper.toDomain(raw);
  }

  async assignCategoryDefaults(
    companyId: string,
    accountIdByCategoryName: ReadonlyMap<string, string>,
    context?: TransactionContext,
  ): Promise<number> {
    const client = prismaClient(this.prisma, context);
    let assigned = 0;

    for (const [name, accountId] of accountIdByCategoryName) {
      const result = await client.category.updateMany({
        where: { company_id: companyId, name, default_account_id: null },
        data: { default_account_id: accountId },
      });
      assigned += result.count;
    }

    return assigned;
  }

  async setActive(
    id: string,
    active: boolean,
    context?: TransactionContext,
  ): Promise<ChartAccountEntity> {
    const raw = await prismaClient(this.prisma, context).chartAccount.update({
      where: { id },
      data: { active },
    });

    return ChartAccountMapper.toDomain(raw);
  }
}
