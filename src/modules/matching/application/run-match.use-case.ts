import { Injectable } from '@nestjs/common';
import {
  AuditEventType,
  InvoiceStatus,
  MatchStatus,
  PayableReleaseReason,
  PayableStatus,
} from 'generated/prisma/enums';
import { IAuditLogRepository } from 'src/modules/audit/domain/audit-logs.repository.interface';
import { FindCompanyByIdUseCase } from 'src/modules/companies/application/find-company-by-id.use-case';
import { IInvoiceRepository } from 'src/modules/invoices/domain/invoices.repository.interface';
import { FindPurchaseOrderByIdUseCase } from 'src/modules/purchase-orders/application/find-purchase-order-by-id.use-case';
import { IPurchaseOrderRepository } from 'src/modules/purchase-orders/domain/purchase-orders.repository.interface';
import { RequestActor } from 'src/modules/purchase-requests/application/find-request-by-id.use-case';
import { ISupplierRepository } from 'src/modules/suppliers/domain/suppliers.repository.interface';
import { MatchResultEntity } from '../domain/match-result.entity';
import { IMatchResultRepository } from '../domain/matching.repository.interface';
import { InvoiceOrderMismatchError } from 'src/modules/invoices/domain/invoices.errors';
import { runThreeWayMatch } from '../domain/services/three-way-match.service';
import { IPayableRepository } from '../domain/payables.repository.interface';
import { FindInvoiceByIdUseCase } from 'src/modules/invoices/application/find-invoice-by-id.use-case';

const DEFAULT_DUE_DAYS = 30;

@Injectable()
export class RunMatchUseCase {
  constructor(
    private readonly matchResultRepository: IMatchResultRepository,
    private readonly payableRepository: IPayableRepository,
    private readonly findInvoiceByIdUseCase: FindInvoiceByIdUseCase,
    private readonly findPurchaseOrderByIdUseCase: FindPurchaseOrderByIdUseCase,
    private readonly purchaseOrderRepository: IPurchaseOrderRepository,
    private readonly supplierRepository: ISupplierRepository,
    private readonly findCompanyByIdUseCase: FindCompanyByIdUseCase,
    private readonly invoiceRepository: IInvoiceRepository,
    private readonly auditLogRepository: IAuditLogRepository,
  ) {}

  async execute(
    invoiceId: string,
    actor: RequestActor,
  ): Promise<MatchResultEntity> {
    const invoice = await this.findInvoiceByIdUseCase.execute(
      invoiceId,
      actor.companyId,
    );

    if (!invoice.purchaseOrderId) {
      throw new InvoiceOrderMismatchError();
    }

    const order = await this.findPurchaseOrderByIdUseCase.execute(
      invoice.purchaseOrderId,
      actor.companyId,
    );

    const company = await this.findCompanyByIdUseCase.execute(actor.companyId);

    const issuerSupplier = await this.supplierRepository.findByCnpj(
      actor.companyId,
      invoice.issuerCnpj,
    );

    const orderItems = await this.purchaseOrderRepository.listItems(order.id);

    const result = runThreeWayMatch({
      orderedItems: orderItems.map((item) => ({
        id: item.id,
        description: item.description,
        quantity: item.quantity,
        unitPriceCents: item.unitPriceCents,
        receivedQuantity: item.receivedQuantity,
      })),
      invoicedItems: (invoice.items ?? []).map((item) => ({
        id: item.id,
        description: item.description,
        quantity: item.quantity,
        unitPriceCents: item.unitPriceCents,
        totalCents: item.totalCents,
        purchaseOrderItemId: item.purchaseOrderItemId,
      })),
      orderSupplierId: order.supplierId,
      invoiceIssuerSupplierId: issuerSupplier?.id ?? null,
      orderTotalCents: order.totalAmountCents,
      invoiceTotalCents: invoice.totalAmountCents,
      tolerance: {
        priceTolerancePercent: company.priceTolerancePercent.toString(),
        quantityTolerancePercent: company.quantityTolerancePercent.toString(),
      },
    });

    const receivedAmountCents = orderItems.reduce(
      (total, item) =>
        total +
        BigInt(
          Math.round(
            Number(item.receivedQuantity) * Number(item.unitPriceCents),
          ),
        ),
      0n,
    );

    const matchResult = await this.matchResultRepository.create({
      companyId: actor.companyId,
      purchaseOrderId: order.id,
      invoiceId: invoice.id,
      status: result.status,
      priceTolerancePercent: company.priceTolerancePercent.toString(),
      quantityTolerancePercent: company.quantityTolerancePercent.toString(),
      orderedAmountCents: order.totalAmountCents,
      receivedAmountCents,
      invoicedAmountCents: invoice.totalAmountCents,
      divergences: result.divergences,
    });

    await this.invoiceRepository.updateStatus(
      invoice.id,
      result.status === MatchStatus.MATCHED
        ? InvoiceStatus.MATCHED
        : InvoiceStatus.DIVERGENT,
    );

    if (result.status === MatchStatus.MATCHED) {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + DEFAULT_DUE_DAYS);

      const company = await this.findCompanyByIdUseCase.execute(
        actor.companyId,
      );

      await this.payableRepository.create({
        companyId: actor.companyId,
        invoiceId: invoice.id,
        supplierId: order.supplierId,
        amountCents: invoice.totalAmountCents,
        dueDate,
        ...(company.autoReleaseOnMatch && {
          status: PayableStatus.RELEASED,
          releaseReason: PayableReleaseReason.MATCHED,
          releasedById: actor.memberId,
        }),
      });
    }

    await this.auditLogRepository.record({
      companyId: actor.companyId,
      actorId: actor.userId,
      eventType: AuditEventType.MATCH_COMPLETED,
      entityType: 'match_result',
      entityId: matchResult.id,
      newData: {
        status: matchResult.status,
        divergenceCount: result.divergences.length,
      },
    });

    return matchResult;
  }
}
