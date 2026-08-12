import { Injectable } from '@nestjs/common';
import { Prisma, RequestStatus, StepStatus } from 'generated/prisma/client';
import { PrismaService } from 'src/shared/infrastructure/database/prisma.service';
import {
  EscalateStepData,
  ISlaStepRepository,
  SlaStepRecord,
} from '../domain/sla-steps.repository.interface';
import { SlaStepMapper } from './mappers/sla-step.mapper';

const DUE_STEP_SELECT = {
  id: true,
  step_order: true,
  expected_approver_id: true,
  reminder_due_at: true,
  escalation_due_at: true,
  purchase_request: {
    select: {
      id: true,
      company_id: true,
      number: true,
      title: true,
      total_amount_cents: true,
      requester_id: true,
    },
  },
} satisfies Prisma.ApprovalStepSelect;

@Injectable()
export class SlaStepRepository implements ISlaStepRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listDueForReminder(now: Date, limit: number): Promise<SlaStepRecord[]> {
    const records = await this.prisma.approvalStep.findMany({
      where: {
        status: StepStatus.WAITING,
        reminder_due_at: { not: null, lte: now },
        purchase_request: { status: RequestStatus.PENDING },
      },
      select: DUE_STEP_SELECT,
      orderBy: { reminder_due_at: 'asc' },
      take: limit,
    });

    return records.map(SlaStepMapper.toReminderRecord);
  }

  async listDueForEscalation(
    now: Date,
    limit: number,
  ): Promise<SlaStepRecord[]> {
    const records = await this.prisma.approvalStep.findMany({
      where: {
        status: StepStatus.WAITING,
        escalation_due_at: { not: null, lte: now },
        purchase_request: { status: RequestStatus.PENDING },
      },
      select: DUE_STEP_SELECT,
      orderBy: { escalation_due_at: 'asc' },
      take: limit,
    });

    return records.map(SlaStepMapper.toEscalationRecord);
  }

  async clearReminder(stepId: string, expectedDueAt: Date): Promise<boolean> {
    const { count } = await this.prisma.approvalStep.updateMany({
      where: { id: stepId, reminder_due_at: expectedDueAt },
      data: { reminder_due_at: null },
    });

    return count === 1;
  }

  async clearEscalation(stepId: string, expectedDueAt: Date): Promise<boolean> {
    const { count } = await this.prisma.approvalStep.updateMany({
      where: { id: stepId, escalation_due_at: expectedDueAt },
      data: { escalation_due_at: null },
    });

    return count === 1;
  }

  async escalate(stepId: string, data: EscalateStepData): Promise<boolean> {
    const { count } = await this.prisma.approvalStep.updateMany({
      where: {
        id: stepId,
        status: StepStatus.WAITING,
        escalation_due_at: data.expectedDueAt,
      },
      data: {
        expected_approver_id: data.toMemberId,
        escalated_from_id: data.fromMemberId,
        escalated_at: new Date(),
        reminder_due_at: data.reminderDueAt,
        escalation_due_at: data.escalationDueAt,
      },
    });

    return count === 1;
  }
}
