import { Injectable } from '@nestjs/common';
import { AuditEventType, PurchaseOrderStatus } from 'generated/prisma/enums';
import { IAuditLogRepository } from 'src/modules/audit/domain/audit-logs.repository.interface';
import { RequestActor } from 'src/modules/purchase-requests/application/find-request-by-id.use-case';
import { CancelPurchaseOrderDto } from '../dto/cancel-purchase-order.dto';
import { PurchaseOrderEntity } from '../domain/purchase-order.entity';
import {
  PurchaseOrderAlreadyCanceledError,
  PurchaseOrderHasReceiptsError,
} from '../domain/purchase-orders.errors';
import { IPurchaseOrderRepository } from '../domain/purchase-orders.repository.interface';
import { FindPurchaseOrderByIdUseCase } from './find-purchase-order-by-id.use-case';

@Injectable()
export class CancelPurchaseOrderUseCase {
  constructor(
    private readonly purchaseOrderRepository: IPurchaseOrderRepository,
    private readonly findPurchaseOrderByIdUseCase: FindPurchaseOrderByIdUseCase,
    private readonly auditLogRepository: IAuditLogRepository,
  ) {}

  async execute(
    id: string,
    actor: RequestActor,
    data: CancelPurchaseOrderDto,
  ): Promise<PurchaseOrderEntity> {
    const order = await this.findPurchaseOrderByIdUseCase.execute(
      id,
      actor.companyId,
    );

    if (order.status === PurchaseOrderStatus.CANCELED) {
      throw new PurchaseOrderAlreadyCanceledError();
    }

    const receipts = await this.purchaseOrderRepository.countReceipts(id);

    if (receipts > 0) {
      throw new PurchaseOrderHasReceiptsError();
    }

    const canceled = await this.purchaseOrderRepository.cancel(
      id,
      actor.memberId,
      data.reason,
    );

    await this.auditLogRepository.record({
      companyId: actor.companyId,
      actorId: actor.userId,
      eventType: AuditEventType.PO_CANCELED,
      entityType: 'purchase_order',
      entityId: order.id,
      oldData: { status: order.status },
      newData: { status: canceled.status, reason: data.reason },
    });

    return canceled;
  }
}
