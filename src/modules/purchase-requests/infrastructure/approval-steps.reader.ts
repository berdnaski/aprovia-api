import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/shared/infrastructure/database/prisma.service';
import { IApprovalStepReader, TimelineStep } from '../domain/request-timeline';
import { ApprovalStepMapper } from './mappers/approval-step.mapper';

const MEMBER_WITH_NAME = {
  select: { id: true, user: { select: { name: true } } },
} as const;

@Injectable()
export class ApprovalStepReader implements IApprovalStepReader {
  constructor(private readonly prisma: PrismaService) {}

  async listByRequest(purchaseRequestId: string): Promise<TimelineStep[]> {
    const records = await this.prisma.approvalStep.findMany({
      where: { purchase_request_id: purchaseRequestId },
      orderBy: { step_order: 'asc' },
      include: {
        expected_approver: MEMBER_WITH_NAME,
        escalated_from: MEMBER_WITH_NAME,
        decisions: {
          orderBy: { decided_at: 'asc' },
          include: {
            decider: MEMBER_WITH_NAME,
            on_behalf_of: MEMBER_WITH_NAME,
          },
        },
      },
    });

    return records.map(ApprovalStepMapper.toTimelineStep);
  }
}
