import {
  DecisionChannel,
  DecisionType,
  RequestStatus,
  StepStatus,
} from 'generated/prisma/enums';

export interface TimelineDecision {
  id: string;
  type: DecisionType;
  justification: string | null;
  channel: DecisionChannel;
  decidedAt: Date;
  deciderId: string;
  deciderName: string;
  onBehalfOfId: string | null;
  onBehalfOfName: string | null;
}

export interface TimelineStep {
  id: string;
  order: number;
  status: StepStatus;
  expectedApproverId: string;
  expectedApproverName: string;
  requiresDualApproval: boolean;
  escalatedFromId: string | null;
  escalatedFromName: string | null;
  escalatedAt: Date | null;
  startedAt: Date | null;
  endedAt: Date | null;
  decisions: TimelineDecision[];
}

export interface RequestTimeline {
  requestId: string;
  number: string;
  status: RequestStatus;
  createdAt: Date;
  submittedAt: Date | null;
  finalizedAt: Date | null;
  canceledById: string | null;
  cancelReason: string | null;
  currentStepOrder: number | null;
  totalSteps: number;
  steps: TimelineStep[];
}

export abstract class IApprovalStepReader {
  abstract listByRequest(purchaseRequestId: string): Promise<TimelineStep[]>;
}

export function actorLabel(decision: TimelineDecision): string {
  return decision.onBehalfOfName
    ? `${decision.deciderName} em nome de ${decision.onBehalfOfName}`
    : decision.deciderName;
}

export function resolveCurrentStepOrder(
  steps: readonly TimelineStep[],
): number | null {
  const waiting = steps
    .filter((step) => step.status === StepStatus.WAITING)
    .sort((a, b) => a.order - b.order);

  return waiting.length > 0 ? waiting[0].order : null;
}
