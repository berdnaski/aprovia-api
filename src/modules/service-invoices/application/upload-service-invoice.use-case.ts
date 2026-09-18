import { Injectable } from '@nestjs/common';
import {
  AuditEventType,
  InvoiceParseStatus,
  WithholdingKind,
} from 'generated/prisma/enums';
import { IAuditLogRepository } from 'src/modules/audit/domain/audit-logs.repository.interface';
import { FindCompanyByIdUseCase } from 'src/modules/companies/application/find-company-by-id.use-case';
import { RequestActor } from 'src/modules/purchase-requests/application/find-request-by-id.use-case';
import { FindSupplierByIdUseCase } from 'src/modules/suppliers/application/find-supplier-by-id.use-case';
import { isUniqueViolation } from 'src/shared/domain/prisma-error';
import { ServiceInvoiceEntity } from '../domain/service-invoice.entity';
import {
  ServiceInvoiceAlreadyRegisteredError,
  ServiceInvoiceRecipientMismatchError,
} from '../domain/service-invoices.errors';
import { IServiceInvoiceRepository } from '../domain/service-invoices.repository.interface';
import { INfseParser } from '../domain/nfse-parser.interface';

@Injectable()
export class UploadServiceInvoiceUseCase {
  constructor(
    private readonly nfseParser: INfseParser,
    private readonly serviceInvoiceRepository: IServiceInvoiceRepository,
    private readonly findCompanyByIdUseCase: FindCompanyByIdUseCase,
    private readonly findSupplierByIdUseCase: FindSupplierByIdUseCase,
    private readonly auditLogRepository: IAuditLogRepository,
  ) {}

  async execute(
    actor: RequestActor,
    xml: string,
    supplierId: string | null = null,
  ): Promise<ServiceInvoiceEntity> {
    const company = await this.findCompanyByIdUseCase.execute(actor.companyId);
    const parsed = this.nfseParser.parse(xml);

    if (parsed.recipientCnpj !== company.cnpj) {
      throw new ServiceInvoiceRecipientMismatchError();
    }

    if (supplierId) {
      await this.findSupplierByIdUseCase.execute(supplierId, actor.companyId);
    }

    const existing = await this.serviceInvoiceRepository.findByAccessKey(
      actor.companyId,
      parsed.accessKey,
    );

    if (existing) {
      throw new ServiceInvoiceAlreadyRegisteredError(existing.number);
    }

    try {
      const serviceInvoice = await this.serviceInvoiceRepository.create({
        companyId: actor.companyId,
        supplierId,
        accessKey: parsed.accessKey,
        number: parsed.number,
        verificationCode: parsed.verificationCode,
        municipalityCode: parsed.municipalityCode,
        issuedAt: parsed.issuedAt,
        issuerCnpj: parsed.issuerCnpj,
        issuerName: parsed.issuerName,
        recipientCnpj: parsed.recipientCnpj,
        serviceDescription: parsed.serviceDescription,
        serviceCode: parsed.serviceCode,
        grossAmountCents: parsed.grossAmountCents,
        discountCents: parsed.discountCents,
        issRate: parsed.issRate,
        issAmountCents: parsed.issAmountCents,
        issWithheld: parsed.issWithheld,
        netAmountCents: parsed.netAmountCents,
        rawXml: xml,
        parseStatus: InvoiceParseStatus.PARSED,
        integrityWarnings: parsed.integrityWarnings,
        uploadedById: actor.memberId,
        withholdings: parsed.withholdings.map((item) => ({
          kind: WithholdingKind[item.kind],
          baseCents: item.baseCents,
          rate: item.rate,
          amountCents: item.amountCents,
        })),
      });

      await this.auditLogRepository.record({
        companyId: actor.companyId,
        actorId: actor.userId,
        eventType: AuditEventType.SERVICE_INVOICE_UPLOADED,
        entityType: 'service_invoice',
        entityId: serviceInvoice.id,
        newData: {
          number: serviceInvoice.number,
          issuerCnpj: serviceInvoice.issuerCnpj,
          netAmountCents: serviceInvoice.netAmountCents.toString(),
        },
      });

      return serviceInvoice;
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ServiceInvoiceAlreadyRegisteredError(parsed.number);
      }
      throw error;
    }
  }
}
