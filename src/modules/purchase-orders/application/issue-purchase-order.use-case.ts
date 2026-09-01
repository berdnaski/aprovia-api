import { FindCompanyByIdUseCase } from 'src/modules/companies/application/find-company-by-id.use-case';
import { Injectable } from '@nestjs/common';
import { AuditEventType, RequestStatus } from 'generated/prisma/enums';
import { IAuditLogRepository } from 'src/modules/audit/domain/audit-logs.repository.interface';
import {
  FindRequestByIdUseCase,
  RequestActor,
} from 'src/modules/purchase-requests/application/find-request-by-id.use-case';
import { IRequestItemRepository } from 'src/modules/purchase-requests/domain/request-items.repository.interface';
import {
  documentNumberPrefix,
  nextDocumentNumber,
} from 'src/shared/domain/document-number';
import { isUniqueViolation } from 'src/shared/domain/prisma-error';
import { ITransactionManager } from 'src/shared/domain/transaction.manager';
import { IssuePurchaseOrderDto } from '../dto/issue-purchase-order.dto';
import { PurchaseOrderEntity } from '../domain/purchase-order.entity';
import { IPurchaseOrderRepository } from '../domain/purchase-orders.repository.interface';
import {
  PurchaseOrderAlreadyIssuedError,
  PurchaseOrderNumberExhaustedError,
  RequestNotApprovedError,
  SupplierRequiredError,
} from '../domain/purchase-orders.errors';

const MAX_NUMBER_ATTEMPTS = 5;

@Injectable()
export class IssuePurchaseOrderUseCase {
  constructor(
    private readonly purchaseOrderRepository: IPurchaseOrderRepository,
    private readonly findRequestByIdUseCase: FindRequestByIdUseCase,
    private readonly requestItemRepository: IRequestItemRepository,
    private readonly findCompanyByIdUseCase: FindCompanyByIdUseCase,
    private readonly auditLogRepository: IAuditLogRepository,
    private readonly transactionManager: ITransactionManager,
  ) {}

  async execute(
    requestId: string,
    actor: RequestActor,
    data: IssuePurchaseOrderDto,
  ): Promise<PurchaseOrderEntity> {
    const request = await this.findRequestByIdUseCase.execute(requestId, actor);

    if (request.status !== RequestStatus.APPROVED) {
      throw new RequestNotApprovedError(request.number);
    }

    if (!request.supplierId) {
      throw new SupplierRequiredError();
    }

    const existing =
      await this.purchaseOrderRepository.findByRequestId(requestId);

    if (existing) {
      throw new PurchaseOrderAlreadyIssuedError(existing.number);
    }

    const items = await this.requestItemRepository.listByRequest(requestId);

    const company = await this.findCompanyByIdUseCase.execute(actor.companyId);
    const chosenPrefix = data.numberPrefix ?? company.poNumberPrefix;

    const year = new Date().getUTCFullYear();
    const prefix = documentNumberPrefix(chosenPrefix, year);

    for (let attempt = 0; attempt < MAX_NUMBER_ATTEMPTS; attempt += 1) {
      try {
        return await this.transactionManager.run(async (context) => {
          const lastNumber = await this.purchaseOrderRepository.findLastNumber(
            actor.companyId,
            prefix,
            context,
          );

          const order = await this.purchaseOrderRepository.create(
            {
              companyId: actor.companyId,
              number: nextDocumentNumber(chosenPrefix, year, lastNumber),
              purchaseRequestId: requestId,
              supplierId: request.supplierId as string,
              totalAmountCents: request.totalAmountCents,
              issuedById: actor.memberId,
              expectedDeliveryAt: data.expectedDeliveryAt
                ? new Date(data.expectedDeliveryAt)
                : null,
              deliveryAddress: data.deliveryAddress ?? null,
              paymentTerms: data.paymentTerms ?? request.paymentTerms ?? null,
              notes: data.notes ?? null,
              items: items.map((item) => ({
                requestItemId: item.id,
                description: item.description,
                quantity: item.quantity,
                unit: item.unit,
                unitPriceCents: item.unitPriceCents,
                totalCents: item.totalCents,
              })),
            },
            context,
          );

          await this.auditLogRepository.record(
            {
              companyId: actor.companyId,
              actorId: actor.userId,
              eventType: AuditEventType.PO_ISSUED,
              entityType: 'purchase_order',
              entityId: order.id,
              newData: {
                number: order.number,
                purchaseRequestNumber: request.number,
                totalAmountCents: order.totalAmountCents.toString(),
              },
            },
            context,
          );

          return order;
        });
      } catch (error) {
        if (isUniqueViolation(error)) {
          continue;
        }
        throw error;
      }
    }

    throw new PurchaseOrderNumberExhaustedError();
  }
}
