import { SlaStepRecord } from '../../domain/sla-steps.repository.interface';

interface RawDueStep {
  id: string;
  step_order: number;
  expected_approver_id: string;
  reminder_due_at: Date | null;
  escalation_due_at: Date | null;
  purchase_request: {
    id: string;
    company_id: string;
    number: string;
    title: string;
    total_amount_cents: bigint;
    requester_id: string;
  };
}

function toRecord(raw: RawDueStep, dueAt: Date | null): SlaStepRecord {
  if (!dueAt) {
    throw new Error(
      `Etapa ${raw.id} veio da varredura de SLA sem prazo: a consulta filtra por prazo não nulo`,
    );
  }

  return {
    stepId: raw.id,
    stepOrder: raw.step_order,
    companyId: raw.purchase_request.company_id,
    requestId: raw.purchase_request.id,
    number: raw.purchase_request.number,
    title: raw.purchase_request.title,
    totalAmountCents: raw.purchase_request.total_amount_cents,
    requesterId: raw.purchase_request.requester_id,
    expectedApproverId: raw.expected_approver_id,
    dueAt,
  };
}

export class SlaStepMapper {
  static toReminderRecord(this: void, raw: RawDueStep): SlaStepRecord {
    return toRecord(raw, raw.reminder_due_at);
  }

  static toEscalationRecord(this: void, raw: RawDueStep): SlaStepRecord {
    return toRecord(raw, raw.escalation_due_at);
  }
}
