import { ApprovalStepRecord } from '../../domain/approval-steps.writer';
import { TimelineStep } from '../../domain/request-timeline';

interface MemberWithName {
  id: string;
  user: { name: string };
}

interface RawTimelineStep {
  id: string;
  purchase_request_id: string;
  expected_approver_id: string;
  step_order: number;
  status: TimelineStep['status'];
  requires_dual_approval: boolean;
  escalated_from_id: string | null;
  escalated_at: Date | null;
  started_at: Date | null;
  ended_at: Date | null;
  expected_approver: MemberWithName;
  escalated_from: MemberWithName | null;
  decisions: {
    id: string;
    type: TimelineStep['decisions'][number]['type'];
    justification: string | null;
    channel: TimelineStep['decisions'][number]['channel'];
    decided_at: Date;
    decider_id: string;
    decider: MemberWithName;
    on_behalf_of_id: string | null;
    on_behalf_of: MemberWithName | null;
  }[];
}

interface RawStepRecord {
  id: string;
  purchase_request_id: string;
  expected_approver_id: string;
  step_order: number;
  status: ApprovalStepRecord['status'];
  requires_dual_approval: boolean;
  decisions: { decider_id: string }[];
}

export class ApprovalStepMapper {
  static toTimelineStep(this: void, raw: RawTimelineStep): TimelineStep {
    return {
      id: raw.id,
      order: raw.step_order,
      status: raw.status,
      expectedApproverId: raw.expected_approver_id,
      expectedApproverName: raw.expected_approver.user.name,
      requiresDualApproval: raw.requires_dual_approval,
      escalatedFromId: raw.escalated_from_id,
      escalatedFromName: raw.escalated_from?.user.name ?? null,
      escalatedAt: raw.escalated_at,
      startedAt: raw.started_at,
      endedAt: raw.ended_at,
      decisions: raw.decisions.map((decision) => ({
        id: decision.id,
        type: decision.type,
        justification: decision.justification,
        channel: decision.channel,
        decidedAt: decision.decided_at,
        deciderId: decision.decider_id,
        deciderName: decision.decider.user.name,
        onBehalfOfId: decision.on_behalf_of_id,
        onBehalfOfName: decision.on_behalf_of?.user.name ?? null,
      })),
    };
  }

  static toStepRecord(this: void, raw: RawStepRecord): ApprovalStepRecord {
    return {
      id: raw.id,
      purchaseRequestId: raw.purchase_request_id,
      expectedApproverId: raw.expected_approver_id,
      stepOrder: raw.step_order,
      status: raw.status,
      requiresDualApproval: raw.requires_dual_approval,
      approvalCount: raw.decisions.length,
      approverIds: raw.decisions.map((decision) => decision.decider_id),
    };
  }
}
