export interface SlaStepRecord {
  stepId: string;
  stepOrder: number;
  companyId: string;
  requestId: string;
  number: string;
  title: string;
  totalAmountCents: bigint;
  requesterId: string;
  expectedApproverId: string;
  dueAt: Date;
}

export interface EscalateStepData {
  toMemberId: string;
  fromMemberId: string;
  expectedDueAt: Date;
  reminderDueAt: Date;
  escalationDueAt: Date;
}

export abstract class ISlaStepRepository {
  abstract listDueForReminder(
    now: Date,
    limit: number,
  ): Promise<SlaStepRecord[]>;

  abstract listDueForEscalation(
    now: Date,
    limit: number,
  ): Promise<SlaStepRecord[]>;

  abstract clearReminder(stepId: string, expectedDueAt: Date): Promise<boolean>;

  abstract clearEscalation(
    stepId: string,
    expectedDueAt: Date,
  ): Promise<boolean>;

  abstract escalate(stepId: string, data: EscalateStepData): Promise<boolean>;
}
