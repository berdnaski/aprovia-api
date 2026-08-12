import { StepStatus } from 'generated/prisma/enums';
import { TransactionContext } from 'src/shared/domain/transaction.manager';

export interface CreateApprovalStepData {
  purchaseRequestId: string;
  expectedApproverId: string;
  stepOrder: number;
  requiresDualApproval: boolean;
  status: StepStatus;
  startedAt: Date | null;
  reminderDueAt: Date | null;
  escalationDueAt: Date | null;
}

export interface StepDeadlines {
  reminderDueAt: Date;
  escalationDueAt: Date;
}

export interface ApprovalStepRecord {
  id: string;
  purchaseRequestId: string;
  expectedApproverId: string;
  stepOrder: number;
  status: StepStatus;
  requiresDualApproval: boolean;
  approvalCount: number;
  approverIds: string[];
}

export abstract class IApprovalStepWriter {
  abstract createMany(
    steps: CreateApprovalStepData[],
    context?: TransactionContext,
  ): Promise<void>;

  abstract findWaiting(
    purchaseRequestId: string,
    context?: TransactionContext,
  ): Promise<ApprovalStepRecord[]>;

  abstract findById(id: string): Promise<ApprovalStepRecord | null>;

  abstract isAssignedApprover(
    purchaseRequestId: string,
    memberId: string,
  ): Promise<boolean>;

  abstract countPendingSteps(
    purchaseRequestId: string,
    context?: TransactionContext,
  ): Promise<number>;

  abstract closeStep(
    id: string,
    status: StepStatus,
    context?: TransactionContext,
  ): Promise<void>;

  abstract startStep(
    purchaseRequestId: string,
    stepOrder: number,
    deadlines: StepDeadlines,
    context?: TransactionContext,
  ): Promise<void>;

  abstract cancelRemaining(
    purchaseRequestId: string,
    context?: TransactionContext,
  ): Promise<void>;

  abstract reassign(
    id: string,
    approverId: string,
    context?: TransactionContext,
  ): Promise<void>;
}
