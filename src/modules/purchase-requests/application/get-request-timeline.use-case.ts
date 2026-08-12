import { Injectable } from '@nestjs/common';
import {
  IApprovalStepReader,
  RequestTimeline,
  resolveCurrentStepOrder,
} from '../domain/request-timeline';
import {
  FindRequestByIdUseCase,
  RequestActor,
} from './find-request-by-id.use-case';

@Injectable()
export class GetRequestTimelineUseCase {
  constructor(
    private readonly findRequestByIdUseCase: FindRequestByIdUseCase,
    private readonly approvalStepReader: IApprovalStepReader,
  ) {}

  async execute(
    requestId: string,
    actor: RequestActor,
  ): Promise<RequestTimeline> {
    const request = await this.findRequestByIdUseCase.execute(requestId, actor);

    const steps = await this.approvalStepReader.listByRequest(requestId);

    return {
      requestId: request.id,
      number: request.number,
      status: request.status,
      createdAt: request.createdAt,
      submittedAt: request.submittedAt,
      finalizedAt: request.finalizedAt,
      canceledById: request.canceledById,
      cancelReason: request.cancelReason,
      currentStepOrder: resolveCurrentStepOrder(steps),
      totalSteps: steps.length,
      steps,
    };
  }
}
