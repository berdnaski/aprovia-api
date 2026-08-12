import { Injectable } from '@nestjs/common';
import { TransactionContext } from 'src/shared/domain/transaction.manager';
import { prismaClient } from 'src/shared/infrastructure/database/prisma-transaction.manager';
import { PrismaService } from 'src/shared/infrastructure/database/prisma.service';
import {
  IMembershipReader,
  MembershipCandidate,
} from '../domain/membership.reader';

@Injectable()
export class MembershipReader implements IMembershipReader {
  constructor(private readonly prisma: PrismaService) {}

  async findUserByEmail(email: string): Promise<MembershipCandidate | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true },
    });

    return user
      ? { userId: user.id, email: user.email, name: user.name }
      : null;
  }

  async isMember(
    companyId: string,
    email: string,
    context?: TransactionContext,
  ): Promise<boolean> {
    const count = await prismaClient(this.prisma, context).companyMember.count({
      where: {
        company_id: companyId,
        disabled_at: null,
        user: { email },
      },
    });

    return count > 0;
  }
}
