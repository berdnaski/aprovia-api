import { Injectable } from '@nestjs/common';
import { InviteStatus } from 'generated/prisma/enums';
import { TransactionContext } from 'src/shared/domain/transaction.manager';
import { prismaClient } from 'src/shared/infrastructure/database/prisma-transaction.manager';
import { PrismaService } from 'src/shared/infrastructure/database/prisma.service';
import { InviteEntity } from '../domain/invite.entity';
import {
  CreateInviteData,
  IInviteRepository,
} from '../domain/invites.repository.interface';
import { InviteMapper } from './mappers/invite.mapper';

@Injectable()
export class InviteRepository implements IInviteRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: CreateInviteData,
    context?: TransactionContext,
  ): Promise<InviteEntity> {
    const record = await prismaClient(this.prisma, context).invite.create({
      data: {
        company_id: data.companyId,
        email: data.email,
        role: data.role,
        default_cost_center_id: data.defaultCostCenterId,
        manager_id: data.managerId,
        invited_by_id: data.invitedById,
      },
    });

    return InviteMapper.toDomain(record);
  }

  async findById(
    id: string,
    context?: TransactionContext,
  ): Promise<InviteEntity | null> {
    const record = await prismaClient(this.prisma, context).invite.findUnique({
      where: { id },
    });

    return record ? InviteMapper.toDomain(record) : null;
  }

  async findPending(
    companyId: string,
    email: string,
  ): Promise<InviteEntity | null> {
    const record = await this.prisma.invite.findFirst({
      where: {
        company_id: companyId,
        email,
        status: InviteStatus.PENDING,
      },
    });

    return record ? InviteMapper.toDomain(record) : null;
  }

  async listByCompany(
    companyId: string,
    status?: InviteStatus,
  ): Promise<InviteEntity[]> {
    const records = await this.prisma.invite.findMany({
      where: { company_id: companyId, status },
      orderBy: { created_at: 'desc' },
    });

    return records.map(InviteMapper.toDomain);
  }

  async markAccepted(
    id: string,
    context?: TransactionContext,
  ): Promise<InviteEntity> {
    const record = await prismaClient(this.prisma, context).invite.update({
      where: { id },
      data: { status: InviteStatus.ACCEPTED, accepted_at: new Date() },
    });

    return InviteMapper.toDomain(record);
  }

  async markRevoked(id: string): Promise<InviteEntity> {
    const record = await this.prisma.invite.update({
      where: { id },
      data: { status: InviteStatus.REVOKED, revoked_at: new Date() },
    });

    return InviteMapper.toDomain(record);
  }

  async expirePending(cutoff: Date): Promise<string[]> {
    const stale = await this.prisma.invite.findMany({
      where: { status: InviteStatus.PENDING, created_at: { lt: cutoff } },
      select: { id: true },
    });

    if (stale.length === 0) {
      return [];
    }

    const ids = stale.map((invite) => invite.id);

    await this.prisma.invite.updateMany({
      where: { id: { in: ids } },
      data: { status: InviteStatus.EXPIRED },
    });

    return ids;
  }
}
