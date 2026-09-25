import { Injectable } from '@nestjs/common';
import { IAbsenceHandover } from 'src/modules/companies/domain/absence-handover';
import { IApprovalStepWriter } from '../domain/approval-steps.writer';

@Injectable()
export class ApprovalQueueHandover implements IAbsenceHandover {
  constructor(private readonly approvalStepWriter: IApprovalStepWriter) {}

  async handOver(
    companyId: string,
    fromMemberId: string,
    toMemberId: string,
  ): Promise<number> {
    const moved = await this.approvalStepWriter.reassignWaitingOf(
      companyId,
      fromMemberId,
      toMemberId,
    );

    return moved.length;
  }
}
