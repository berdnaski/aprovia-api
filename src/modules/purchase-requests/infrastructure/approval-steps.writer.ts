import { Injectable } from '@nestjs/common';
import { StepStatus } from 'generated/prisma/enums';
import { TransactionContext } from 'src/shared/domain/transaction.manager';
import { prismaClient } from 'src/shared/infrastructure/database/prisma-transaction.manager';
import { PrismaService } from 'src/shared/infrastructure/database/prisma.service';
import {
  ApprovalStepRecord,
  CreateApprovalStepData,
  IApprovalStepWriter,
  StepDeadlines,
} from '../domain/approval-steps.writer';
import { ApprovalStepMapper } from './mappers/approval-step.mapper';

const OPEN_STATUSES: StepStatus[] = [StepStatus.WAITING];

@Injectable()
export class ApprovalStepWriter implements IApprovalStepWriter {
  constructor(private readonly prisma: PrismaService) {}

  async createMany(
    steps: CreateApprovalStepData[],
    context?: TransactionContext,
  ): Promise<void> {
    if (steps.length === 0) {
      return;
    }

    await prismaClient(this.prisma, context).approvalStep.createMany({
      data: steps.map((step) => ({
        purchase_request_id: step.purchaseRequestId,
        expected_approver_id: step.expectedApproverId,
        step_order: step.stepOrder,
        requires_dual_approval: step.requiresDualApproval,
        status: step.status,
        started_at: step.startedAt,
        reminder_due_at: step.reminderDueAt,
        escalation_due_at: step.escalationDueAt,
      })),
    });
  }

  async findWaiting(
    purchaseRequestId: string,
    context?: TransactionContext,
  ): Promise<ApprovalStepRecord[]> {
    const records = await prismaClient(
      this.prisma,
      context,
    ).approvalStep.findMany({
      where: {
        purchase_request_id: purchaseRequestId,
        status: { in: OPEN_STATUSES },
      },
      orderBy: { step_order: 'asc' },
      include: {
        decisions: {
          where: { type: 'APPROVED' },
          select: { decider_id: true },
        },
      },
    });

    return records.map(ApprovalStepMapper.toStepRecord);
  }

  async findById(id: string): Promise<ApprovalStepRecord | null> {
    const record = await this.prisma.approvalStep.findUnique({
      where: { id },
      include: {
        decisions: {
          where: { type: 'APPROVED' },
          select: { decider_id: true },
        },
      },
    });

    return record ? ApprovalStepMapper.toStepRecord(record) : null;
  }

  async isAssignedApprover(
    purchaseRequestId: string,
    memberId: string,
  ): Promise<boolean> {
    const count = await this.prisma.approvalStep.count({
      where: {
        purchase_request_id: purchaseRequestId,
        OR: [
          { expected_approver_id: memberId },
          { escalated_from_id: memberId },
        ],
      },
    });

    return count > 0;
  }

  countPendingSteps(
    purchaseRequestId: string,
    context?: TransactionContext,
  ): Promise<number> {
    return prismaClient(this.prisma, context).approvalStep.count({
      where: {
        purchase_request_id: purchaseRequestId,
        status: { in: OPEN_STATUSES },
      },
    });
  }

  async closeStep(
    id: string,
    status: StepStatus,
    context?: TransactionContext,
  ): Promise<void> {
    await prismaClient(this.prisma, context).approvalStep.update({
      where: { id },
      data: { status, ended_at: new Date() },
    });
  }

  async startStep(
    purchaseRequestId: string,
    stepOrder: number,
    deadlines: StepDeadlines,
    context?: TransactionContext,
  ): Promise<void> {
    await prismaClient(this.prisma, context).approvalStep.updateMany({
      where: {
        purchase_request_id: purchaseRequestId,
        step_order: stepOrder,
        started_at: null,
      },
      data: {
        started_at: new Date(),
        reminder_due_at: deadlines.reminderDueAt,
        escalation_due_at: deadlines.escalationDueAt,
      },
    });
  }

  async cancelRemaining(
    purchaseRequestId: string,
    context?: TransactionContext,
  ): Promise<void> {
    await prismaClient(this.prisma, context).approvalStep.updateMany({
      where: {
        purchase_request_id: purchaseRequestId,
        status: { in: OPEN_STATUSES },
      },
      data: { status: StepStatus.CANCELED, ended_at: new Date() },
    });
  }

  async reassign(
    id: string,
    approverId: string,
    context?: TransactionContext,
  ): Promise<void> {
    await prismaClient(this.prisma, context).approvalStep.update({
      where: { id },
      data: { expected_approver_id: approverId },
    });
  }
}
