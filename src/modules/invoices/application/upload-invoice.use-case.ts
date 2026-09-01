import { Injectable } from '@nestjs/common';
import {
  AuditEventType,
  InvoiceParseStatus,
  NfeAuthorizationStatus,
  NfeEnvironment,
} from 'generated/prisma/enums';
import { IAuditLogRepository } from 'src/modules/audit/domain/audit-logs.repository.interface';
import { FindCompanyByIdUseCase } from 'src/modules/companies/application/find-company-by-id.use-case';
import { FindPurchaseOrderByIdUseCase } from 'src/modules/purchase-orders/application/find-purchase-order-by-id.use-case';
import { RequestActor } from 'src/modules/purchase-requests/application/find-request-by-id.use-case';
import { isUniqueViolation } from 'src/shared/domain/prisma-error';
import { InvoiceEntity } from '../domain/invoice.entity';
import {
  InvoiceAlreadyRegisteredError,
  InvoiceHomologationError,
  InvoiceNotAuthorizedError,
  InvoiceRecipientMismatchError,
} from '../domain/invoices.errors';
import { IInvoiceRepository } from '../domain/invoices.repository.interface';
import { INfeParser } from '../domain/nfe-parser.interface';

@Injectable()
export class UploadInvoiceUseCase {
  constructor(
    private readonly nfeParser: INfeParser,
    private readonly invoiceRepository: IInvoiceRepository,
    private readonly findPurchaseOrderByIdUseCase: FindPurchaseOrderByIdUseCase,
    private readonly findCompanyByIdUseCase: FindCompanyByIdUseCase,
    private readonly auditLogRepository: IAuditLogRepository,
  ) {}

  async execute(
    actor: RequestActor,
    xml: string,
    purchaseOrderId: string | null = null,
  ): Promise<InvoiceEntity> {
    const company = await this.findCompanyByIdUseCase.execute(actor.companyId);
    const parsed = this.nfeParser.parse(xml);

    if (parsed.recipientCnpj !== company.cnpj) {
      throw new InvoiceRecipientMismatchError();
    }

    if (parsed.authorization.status !== 'AUTHORIZED') {
      throw new InvoiceNotAuthorizedError(
        parsed.authorization.statusCode,
        parsed.authorization.reason,
      );
    }

    if (parsed.authorization.environment === 'HOMOLOGATION') {
      throw new InvoiceHomologationError();
    }

    const existing = await this.invoiceRepository.findByAccessKey(
      actor.companyId,
      parsed.accessKey,
    );

    if (existing) {
      throw new InvoiceAlreadyRegisteredError(existing.number);
    }

    const order = purchaseOrderId
      ? await this.findPurchaseOrderByIdUseCase.execute(
          purchaseOrderId,
          actor.companyId,
        )
      : null;

    try {
      const invoice = await this.invoiceRepository.create({
        companyId: actor.companyId,
        purchaseOrderId: order?.id ?? null,
        supplierId: order?.supplierId ?? null,
        accessKey: parsed.accessKey,
        number: parsed.number,
        series: parsed.series,
        issuedAt: parsed.issuedAt,
        issuerCnpj: parsed.issuerCnpj,
        issuerName: parsed.issuerName,
        recipientCnpj: parsed.recipientCnpj,
        totalAmountCents: parsed.totalAmountCents,
        productsAmountCents: parsed.productsAmountCents,
        freightCents: parsed.freightCents,
        insuranceCents: parsed.insuranceCents,
        discountCents: parsed.discountCents,
        rawXml: xml,
        parseStatus: InvoiceParseStatus.PARSED,
        authorizationStatus: NfeAuthorizationStatus.AUTHORIZED,
        protocolNumber: parsed.authorization.protocolNumber,
        protocolStatusCode: parsed.authorization.statusCode,
        protocolReason: parsed.authorization.reason,
        protocolReceivedAt: parsed.authorization.receivedAt,
        environment: NfeEnvironment.PRODUCTION,
        integrityWarnings: parsed.integrityWarnings,
        uploadedById: actor.memberId,
        items: parsed.items.map((item) => ({
          sequence: item.sequence,
          description: item.description,
          ncm: item.ncm,
          cfop: item.cfop,
          quantity: item.quantity,
          unit: item.unit,
          unitPriceCents: item.unitPriceCents,
          totalCents: item.totalCents,
        })),
        taxes: parsed.items.flatMap((item) => item.taxes),
      });

      await this.auditLogRepository.record({
        companyId: actor.companyId,
        actorId: actor.userId,
        eventType: AuditEventType.INVOICE_UPLOADED,
        entityType: 'invoice',
        entityId: invoice.id,
        newData: {
          number: invoice.number,
          issuerCnpj: invoice.issuerCnpj,
          totalAmountCents: invoice.totalAmountCents.toString(),
          linkedToOrder: Boolean(order),
        },
      });

      return invoice;
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new InvoiceAlreadyRegisteredError(parsed.number);
      }
      throw error;
    }
  }
}
