import { ApiProperty } from '@nestjs/swagger';
import {
  DecisionChannel,
  DecisionType,
  RequestStatus,
  StepStatus,
} from 'generated/prisma/enums';
import {
  actorLabel,
  RequestTimeline,
  TimelineStep,
} from '../domain/request-timeline';

export class TimelineDecisionDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({
    enum: [
      'APPROVED',
      'REJECTED',
      'CHANGES_REQUESTED',
      'APPROVED_WITH_OVERRIDE',
    ],
  })
  type: DecisionType;

  @ApiProperty({
    example: 'Carlos Souza em nome de Marina Lima',
    description:
      'Quando a decisão foi tomada por substituto temporário, o rótulo registra em nome de quem (RN29).',
  })
  actor: string;

  @ApiProperty({ nullable: true, type: String })
  justification: string | null;

  @ApiProperty({ enum: ['PLATFORM', 'EMAIL'] })
  channel: DecisionChannel;

  @ApiProperty()
  decidedAt: Date;
}

export class TimelineStepDto {
  @ApiProperty({ example: 1 })
  order: number;

  @ApiProperty({
    enum: ['WAITING', 'APPROVED', 'REJECTED', 'ESCALATED', 'CANCELED'],
  })
  status: StepStatus;

  @ApiProperty({ description: 'Etapa em que o pedido está parado agora.' })
  isCurrent: boolean;

  @ApiProperty({ format: 'uuid' })
  expectedApproverId: string;

  @ApiProperty({ example: 'Marina Lima' })
  expectedApproverName: string;

  @ApiProperty({ description: 'Dupla assinatura nesta etapa (RN26).' })
  requiresDualApproval: boolean;

  @ApiProperty({
    nullable: true,
    type: String,
    description: 'Preenchido quando a etapa chegou por escalonamento (RN32).',
  })
  escalatedFromName: string | null;

  @ApiProperty({ nullable: true, type: Date })
  escalatedAt: Date | null;

  @ApiProperty({ nullable: true, type: Date })
  startedAt: Date | null;

  @ApiProperty({ nullable: true, type: Date })
  endedAt: Date | null;

  @ApiProperty({ type: [TimelineDecisionDto] })
  decisions: TimelineDecisionDto[];

  static fromStep(step: TimelineStep, currentOrder: number | null) {
    const dto = new TimelineStepDto();

    dto.order = step.order;
    dto.status = step.status;
    dto.isCurrent = step.order === currentOrder;
    dto.expectedApproverId = step.expectedApproverId;
    dto.expectedApproverName = step.expectedApproverName;
    dto.requiresDualApproval = step.requiresDualApproval;
    dto.escalatedFromName = step.escalatedFromName;
    dto.escalatedAt = step.escalatedAt;
    dto.startedAt = step.startedAt;
    dto.endedAt = step.endedAt;
    dto.decisions = step.decisions.map((decision) => {
      const decisionDto = new TimelineDecisionDto();

      decisionDto.id = decision.id;
      decisionDto.type = decision.type;
      decisionDto.actor = actorLabel(decision);
      decisionDto.justification = decision.justification;
      decisionDto.channel = decision.channel;
      decisionDto.decidedAt = decision.decidedAt;

      return decisionDto;
    });

    return dto;
  }
}

export class RequestTimelineResponseDto {
  @ApiProperty({ format: 'uuid' })
  requestId: string;

  @ApiProperty({ example: 'REQ-2026-0042' })
  number: string;

  @ApiProperty({
    enum: [
      'DRAFT',
      'PENDING',
      'CHANGES_REQUESTED',
      'APPROVED',
      'REJECTED',
      'CANCELED',
      'COMPLETED',
    ],
  })
  status: RequestStatus;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty({ nullable: true, type: Date, description: 'Marco do SLA.' })
  submittedAt: Date | null;

  @ApiProperty({ nullable: true, type: Date })
  finalizedAt: Date | null;

  @ApiProperty({ nullable: true, type: String })
  cancelReason: string | null;

  @ApiProperty({
    nullable: true,
    type: Number,
    description:
      'Ordem da etapa em que o pedido está parado. Nulo quando ainda é rascunho ou já foi finalizado.',
  })
  currentStepOrder: number | null;

  @ApiProperty({ example: 3, description: 'Tamanho da cascata congelada.' })
  totalSteps: number;

  @ApiProperty({
    type: [TimelineStepDto],
    description:
      'Cascata completa, incluindo as etapas futuras ainda WAITING. Lida de approval_steps, nunca recalculada (RN22).',
  })
  steps: TimelineStepDto[];

  static fromTimeline(timeline: RequestTimeline): RequestTimelineResponseDto {
    const dto = new RequestTimelineResponseDto();

    dto.requestId = timeline.requestId;
    dto.number = timeline.number;
    dto.status = timeline.status;
    dto.createdAt = timeline.createdAt;
    dto.submittedAt = timeline.submittedAt;
    dto.finalizedAt = timeline.finalizedAt;
    dto.cancelReason = timeline.cancelReason;
    dto.currentStepOrder = timeline.currentStepOrder;
    dto.totalSteps = timeline.totalSteps;
    dto.steps = timeline.steps.map((step) =>
      TimelineStepDto.fromStep(step, timeline.currentStepOrder),
    );

    return dto;
  }
}
