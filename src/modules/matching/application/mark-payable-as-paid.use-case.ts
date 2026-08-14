import { Injectable } from '@nestjs/common';
import { AuditEventType, PayableStatus } from 'generated/prisma/enums';
import { IAuditLogRepository } from 'src/modules/audit/domain/audit-logs.repository.interface';
import { RequestActor } from 'src/modules/purchase-requests/application/find-request-by-id.use-case';
import { PayableEntity } from '../domain/payable.entity';
import {
  PayableNotFoundError,
  PayableNotReleasedError,
} from '../domain/matching.errors';
import { IPayableRepository } from '../domain/payables.repository.interface';

@Injectable()
export class MarkPayableAsPaidUseCase {
  constructor(
    private readonly payableRepository: IPayableRepository,
    private readonly auditLogRepository: IAuditLogRepository,
  ) {}

  async execute(id: string, actor: RequestActor): Promise<PayableEntity> {
    const payable = await this.payableRepository.findById(
      id,
      actor.companyId,
    );

    if (!payable) {
      throw new PayableNotFoundError();
    }

    if (payable.status !== PayableStatus.RELEASED) {
      throw new PayableNotReleasedError();
    }

    const paid = await this.payableRepository.markAsPaid(id);

    await this.auditLogRepository.record({
      companyId: actor.companyId,
      actorId: actor.userId,
      eventType: AuditEventType.PAYABLE_PAID,
      entityType: 'payable',
      entityId: payable.id,
      newData: { amountCents: payable.amountCents.toString() },
    });

    return paid;
  }
}
