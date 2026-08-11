import { Injectable } from '@nestjs/common';
import { TransactionContext } from 'src/shared/domain/transaction.manager';
import { prismaClient } from 'src/shared/infrastructure/database/prisma-transaction.manager';
import { PrismaService } from 'src/shared/infrastructure/database/prisma.service';
import { CostCenterMemberEntity } from '../domain/cost-center-member.entity';
import { ICostCenterMemberRepository } from '../domain/cost-center-members.repository.interface';
import { CostCenterMemberMapper } from './mappers/cost-center-member.mapper';

@Injectable()
export class CostCenterMemberRepository implements ICostCenterMemberRepository {
  constructor(private readonly prisma: PrismaService) {}

  async link(
    costCenterId: string,
    memberId: string,
    context?: TransactionContext,
  ): Promise<CostCenterMemberEntity> {
    const raw = await prismaClient(
      this.prisma,
      context,
    ).costCenterMember.create({
      data: { cost_center_id: costCenterId, member_id: memberId },
    });

    return CostCenterMemberMapper.toDomain(raw);
  }

  async linkIfAbsent(
    costCenterId: string,
    memberId: string,
    context?: TransactionContext,
  ): Promise<void> {
    await prismaClient(this.prisma, context).costCenterMember.createMany({
      data: [{ cost_center_id: costCenterId, member_id: memberId }],
      skipDuplicates: true,
    });
  }

  async unlink(costCenterId: string, memberId: string): Promise<void> {
    await this.prisma.costCenterMember.delete({
      where: {
        cost_center_id_member_id: {
          cost_center_id: costCenterId,
          member_id: memberId,
        },
      },
    });
  }

  async findLink(
    costCenterId: string,
    memberId: string,
  ): Promise<CostCenterMemberEntity | null> {
    const raw = await this.prisma.costCenterMember.findUnique({
      where: {
        cost_center_id_member_id: {
          cost_center_id: costCenterId,
          member_id: memberId,
        },
      },
    });

    return raw ? CostCenterMemberMapper.toDomain(raw) : null;
  }

  async listByCostCenter(
    costCenterId: string,
  ): Promise<CostCenterMemberEntity[]> {
    const records = await this.prisma.costCenterMember.findMany({
      where: { cost_center_id: costCenterId },
      orderBy: { created_at: 'asc' },
    });

    return records.map(CostCenterMemberMapper.toDomain);
  }

  async listByMember(
    memberId: string,
    context?: TransactionContext,
  ): Promise<CostCenterMemberEntity[]> {
    const records = await prismaClient(
      this.prisma,
      context,
    ).costCenterMember.findMany({
      where: { member_id: memberId },
    });

    return records.map(CostCenterMemberMapper.toDomain);
  }
}
