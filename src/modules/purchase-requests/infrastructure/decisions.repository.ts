import { Injectable } from '@nestjs/common';
import { TransactionContext } from 'src/shared/domain/transaction.manager';
import { prismaClient } from 'src/shared/infrastructure/database/prisma-transaction.manager';
import { PrismaService } from 'src/shared/infrastructure/database/prisma.service';
import {
  CreateDecisionData,
  IDecisionRepository,
} from '../domain/decisions.repository.interface';

@Injectable()
export class DecisionRepository implements IDecisionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: CreateDecisionData,
    context?: TransactionContext,
  ): Promise<{ id: string }> {
    const raw = await prismaClient(this.prisma, context).decision.create({
      data: {
        approval_step_id: data.approvalStepId,
        decider_id: data.deciderId,
        on_behalf_of_id: data.onBehalfOfId,
        type: data.type,
        justification: data.justification,
        budget_at_time_cents: data.budgetAtTimeCents,
        committed_at_time_cents: data.committedAtTimeCents,
        available_at_time_cents: data.availableAtTimeCents,
        channel: data.channel,
      },
      select: { id: true },
    });

    return raw;
  }
}
