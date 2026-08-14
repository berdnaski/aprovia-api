import { Injectable } from '@nestjs/common';
import {
  AuditEventType,
  CompanyMemberRole,
  PurchaseOrderStatus,
} from 'generated/prisma/enums';
import { IAuditLogRepository } from 'src/modules/audit/domain/audit-logs.repository.interface';
import { FindPurchaseOrderByIdUseCase } from 'src/modules/purchase-orders/application/find-purchase-order-by-id.use-case';
import { IPurchaseOrderRepository } from 'src/modules/purchase-orders/domain/purchase-orders.repository.interface';
import { resolveStatusAfterReceipt } from 'src/modules/purchase-orders/domain/services/purchase-order-status.service';
import {
  FindRequestByIdUseCase,
  RequestActor,
} from 'src/modules/purchase-requests/application/find-request-by-id.use-case';
import {
  documentNumberPrefix,
  nextDocumentNumber,
} from 'src/shared/domain/document-number';
import { isUniqueViolation } from 'src/shared/domain/prisma-error';
import { ITransactionManager } from 'src/shared/domain/transaction.manager';
import { ReceiptEntity } from '../domain/receipt.entity';
import {
  EmptyReceiptError,
  ItemNotInOrderError,
  NegativeQuantityError,
  OrderNotReceivableError,
  QuantityExceedsOrderError,
  ReceiptNotOwnedError,
  ReceiptNumberExhaustedError,
  RejectionReasonRequiredError,
} from '../domain/receipts.errors';
import { IReceiptRepository } from '../domain/receipts.repository.interface';
import {
  findBalanceViolation,
  hasDivergence,
  resolveReceiptStatus,
} from '../domain/services/receipt-balance.service';
import { RegisterReceiptDto } from '../dto/register-receipt.dto';

const NUMBER_PREFIX = 'REC';
const MAX_NUMBER_ATTEMPTS = 5;

@Injectable()
export class RegisterReceiptUseCase {
  constructor(
    private readonly receiptRepository: IReceiptRepository,
    private readonly purchaseOrderRepository: IPurchaseOrderRepository,
    private readonly findPurchaseOrderByIdUseCase: FindPurchaseOrderByIdUseCase,
    private readonly findRequestByIdUseCase: FindRequestByIdUseCase,
    private readonly auditLogRepository: IAuditLogRepository,
    private readonly transactionManager: ITransactionManager,
  ) {}

  async execute(
    purchaseOrderId: string,
    actor: RequestActor,
    data: RegisterReceiptDto,
  ): Promise<ReceiptEntity> {
    const order = await this.findPurchaseOrderByIdUseCase.execute(
      purchaseOrderId,
      actor.companyId,
    );

    if (order.status === PurchaseOrderStatus.CANCELED) {
      throw new OrderNotReceivableError(order.number);
    }

    if (actor.role !== CompanyMemberRole.FINANCE_ADMIN) {
      const request = await this.findRequestByIdUseCase.execute(
        order.purchaseRequestId,
        actor,
      );

      if (request.requesterId !== actor.memberId) {
        throw new ReceiptNotOwnedError();
      }
    }

    if (!data.items.length) {
      throw new EmptyReceiptError();
    }

    this.assertLinesAreValid(data);

    const year = new Date().getUTCFullYear();
    const prefix = documentNumberPrefix(NUMBER_PREFIX, year);

    for (let attempt = 0; attempt < MAX_NUMBER_ATTEMPTS; attempt += 1) {
      try {
        return await this.transactionManager.run(async (context) => {
          await this.receiptRepository.lockOrderItems(purchaseOrderId, context);

          const items = await this.purchaseOrderRepository.listItems(
            purchaseOrderId,
            context,
          );

          const snapshots = items.map((item) => ({
            id: item.id,
            description: item.description,
            orderedQuantity: item.quantity,
            receivedQuantity: item.receivedQuantity,
          }));

          const lines = data.items.map((line) => ({
            purchaseOrderItemId: line.purchaseOrderItemId,
            quantity: line.quantity,
            rejectedQuantity: line.rejectedQuantity ?? '0',
          }));

          const unknown = lines.some(
            (line) =>
              !snapshots.some(
                (snapshot) => snapshot.id === line.purchaseOrderItemId,
              ),
          );

          if (unknown) {
            throw new ItemNotInOrderError();
          }

          const violation = findBalanceViolation(snapshots, lines);

          if (violation) {
            throw new QuantityExceedsOrderError(
              violation.description,
              violation.pending,
              violation.informed,
            );
          }

          const lastNumber = await this.receiptRepository.findLastNumber(
            actor.companyId,
            prefix,
            context,
          );

          const receipt = await this.receiptRepository.create(
            {
              companyId: actor.companyId,
              number: nextDocumentNumber(NUMBER_PREFIX, year, lastNumber),
              purchaseOrderId,
              receivedById: actor.memberId,
              receivedAt: data.receivedAt
                ? new Date(data.receivedAt)
                : new Date(),
              status: resolveReceiptStatus(snapshots, lines),
              hasDivergence: hasDivergence(lines),
              notes: data.notes ?? null,
              items: data.items.map((line) => ({
                purchaseOrderItemId: line.purchaseOrderItemId,
                quantity: line.quantity,
                rejectedQuantity: line.rejectedQuantity ?? '0',
                rejectionReason: line.rejectionReason ?? null,
              })),
            },
            context,
          );

          for (const line of lines) {
            if (Number(line.quantity) > 0) {
              await this.receiptRepository.incrementReceivedQuantity(
                line.purchaseOrderItemId,
                line.quantity,
                context,
              );
            }
          }

          const updated = await this.purchaseOrderRepository.listItems(
            purchaseOrderId,
            context,
          );

          await this.purchaseOrderRepository.updateStatus(
            purchaseOrderId,
            resolveStatusAfterReceipt(
              updated.map((item) => ({
                orderedQuantity: item.quantity,
                receivedQuantity: item.receivedQuantity,
              })),
            ),
            context,
          );

          await this.auditLogRepository.record(
            {
              companyId: actor.companyId,
              actorId: actor.userId,
              eventType: AuditEventType.GOODS_RECEIVED,
              entityType: 'receipt',
              entityId: receipt.id,
              newData: {
                number: receipt.number,
                purchaseOrderNumber: order.number,
                status: receipt.status,
                hasDivergence: receipt.hasDivergence,
              },
            },
            context,
          );

          return receipt;
        });
      } catch (error) {
        if (isUniqueViolation(error)) {
          continue;
        }
        throw error;
      }
    }

    throw new ReceiptNumberExhaustedError();
  }

  private assertLinesAreValid(data: RegisterReceiptDto): void {
    for (const line of data.items) {
      const quantity = Number(line.quantity);
      const rejected = Number(line.rejectedQuantity ?? '0');

      if (quantity < 0 || rejected < 0) {
        throw new NegativeQuantityError();
      }

      if (rejected > 0 && !line.rejectionReason?.trim()) {
        throw new RejectionReasonRequiredError();
      }
    }
  }
}
