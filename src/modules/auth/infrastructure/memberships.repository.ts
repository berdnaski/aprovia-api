import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/shared/infrastructure/database/prisma.service';
import { MembershipEntity } from '../domain/membership.entity';
import { IMembershipsRepository } from '../domain/memberships.repository.interface';

@Injectable()
export class MembershipsRepository implements IMembershipsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findActiveByUser(userId: string): Promise<MembershipEntity | null> {
    const record = await this.prisma.companyMember.findFirst({
      where: {
        user_id: userId,
        disabled_at: null,
        company: { disabled_at: null },
      },
      include: {
        company: { select: { legal_name: true, trade_name: true } },
      },
    });

    if (!record) {
      return null;
    }

    const entity = new MembershipEntity();
    entity.memberId = record.id;
    entity.companyId = record.company_id;
    entity.companyName =
      record.company.trade_name ?? record.company.legal_name;
    entity.role = record.role;

    return entity;
  }
}
