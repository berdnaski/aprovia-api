import { Injectable } from '@nestjs/common';
import { CompanyMemberRole } from 'generated/prisma/enums';
import { PrismaService } from 'src/shared/infrastructure/database/prisma.service';
import { NotificationRecipient } from '../domain/notification.entity';
import {
  NotificationRecipientRef,
  RecipientKind,
} from '../domain/notification.dispatcher';
import { INotificationRecipientRepository } from '../domain/notification-recipients.repository.interface';

@Injectable()
export class NotificationRecipientRepository implements INotificationRecipientRepository {
  constructor(private readonly prisma: PrismaService) {}

  async resolve(
    ref: NotificationRecipientRef,
  ): Promise<NotificationRecipient | null> {
    if (ref.kind === RecipientKind.USER) {
      const user = await this.prisma.user.findFirst({
        where: { id: ref.userId, disabled_at: null },
        select: { id: true, name: true, email: true },
      });

      return user
        ? { userId: user.id, name: user.name, email: user.email }
        : null;
    }

    const member = await this.prisma.companyMember.findFirst({
      where: { id: ref.memberId, disabled_at: null },
      select: {
        user: {
          select: { id: true, name: true, email: true, disabled_at: true },
        },
      },
    });

    if (!member || member.user.disabled_at) {
      return null;
    }

    return {
      userId: member.user.id,
      name: member.user.name,
      email: member.user.email,
    };
  }

  async listFinanceAdmins(companyId: string): Promise<{ memberId: string }[]> {
    const members = await this.prisma.companyMember.findMany({
      where: {
        company_id: companyId,
        role: CompanyMemberRole.FINANCE_ADMIN,
        disabled_at: null,
      },
      select: { id: true },
    });

    return members.map((member) => ({ memberId: member.id }));
  }
}
