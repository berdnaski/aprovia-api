import { Injectable } from '@nestjs/common';
import { AuditEventType, PurchaseOrderStatus } from 'generated/prisma/enums';
import { IAuditLogRepository } from 'src/modules/audit/domain/audit-logs.repository.interface';
import { RequestActor } from 'src/modules/purchase-requests/application/find-request-by-id.use-case';
import { PurchaseOrderEntity } from '../domain/purchase-order.entity';
import { PurchaseOrderAlreadyCanceledError } from '../domain/purchase-orders.errors';
import { IPurchaseOrderRepository } from '../domain/purchase-orders.repository.interface';
import { FindPurchaseOrderByIdUseCase } from './find-purchase-order-by-id.use-case';

@Injectable()
export class SendPurchaseOrderUseCase {
  constructor(
    private readonly purchaseOrderRepository: IPurchaseOrderRepository,
    private readonly findPurchaseOrderByIdUseCase: FindPurchaseOrderByIdUseCase,
    private readonly auditLogRepository: IAuditLogRepository,
  ) {}

  async execute(
    id: string,
    actor: RequestActor,
  ): Promise<PurchaseOrderEntity> {
    const order = await this.findPurchaseOrderByIdUseCase.execute(
      id,
      actor.companyId,
    );

    if (order.status === PurchaseOrderStatus.CANCELED) {
      throw new PurchaseOrderAlreadyCanceledError();
    }

    const sent = await this.purchaseOrderRepository.markAsSent(id, new Date());

    await this.auditLogRepository.record({
      companyId: actor.companyId,
      actorId: actor.userId,
      eventType: AuditEventType.PO_SENT,
      entityType: 'purchase_order',
      entityId: order.id,
      newData: { number: order.number },
    });

    return sent;
  }
}
