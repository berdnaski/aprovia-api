import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import {
  AuditEventType,
  CompanyMemberRole,
  PayableReleaseReason,
} from 'generated/prisma/enums';
import { IAuditLogRepository } from 'src/modules/audit/domain/audit-logs.repository.interface';
import { FindCompanyByIdUseCase } from 'src/modules/companies/application/find-company-by-id.use-case';
import { RequestActor } from 'src/modules/purchase-requests/application/find-request-by-id.use-case';
import { ForbiddenError } from 'src/shared/domain/errors/domain.error';
import { detectMimeType } from 'src/shared/domain/file-signature';
import { IStorageService } from 'src/shared/domain/storage.service';
import { PayableEntity } from '../domain/payable.entity';
import {
  ProofRequiredError,
  UnsupportedProofFileTypeError,
} from '../domain/matching.errors';
import { IPayableRepository } from '../domain/payables.repository.interface';
import { ReleasePayableWithoutInvoiceDto } from '../dto/release-payable-without-invoice.dto';

interface UploadedFileLike {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
}

@Injectable()
export class ReleasePayableWithoutInvoiceUseCase {
  constructor(
    private readonly payableRepository: IPayableRepository,
    private readonly storageService: IStorageService,
    private readonly auditLogRepository: IAuditLogRepository,
    private readonly findCompanyByIdUseCase: FindCompanyByIdUseCase,
  ) {}

  async execute(
    actor: RequestActor,
    data: ReleasePayableWithoutInvoiceDto,
    proof: UploadedFileLike | undefined,
  ): Promise<PayableEntity> {
    if (actor.role !== CompanyMemberRole.FINANCE_ADMIN) {
      throw new ForbiddenError(
        'Só o Admin Financeiro pode liberar um pagamento sem nota fiscal conferível (RN66).',
      );
    }

    const company = await this.findCompanyByIdUseCase.execute(actor.companyId);
    const amountCents = BigInt(data.amountCents);

    const belowThreshold =
      company.matchRequiredAboveCents !== null &&
      amountCents <= company.matchRequiredAboveCents;

    if (!proof && !belowThreshold) {
      throw new ProofRequiredError();
    }

    let storageKey: string | null = null;

    if (proof) {
      const detected = detectMimeType(proof.buffer);

      if (!detected) {
        throw new UnsupportedProofFileTypeError();
      }

      storageKey = `companies/${actor.companyId}/payables/${randomUUID()}`;

      await this.storageService.upload({
        storageKey,
        body: proof.buffer,
        mimeType: detected,
      });
    }

    const releaseReason = belowThreshold
      ? PayableReleaseReason.BELOW_MATCH_THRESHOLD
      : PayableReleaseReason.NO_INVOICE_REQUIRED;

    const payable = await this.payableRepository.create({
      companyId: actor.companyId,
      invoiceId: null,
      supplierId: data.supplierId,
      amountCents,
      dueDate: new Date(data.dueDate),
    });

    const released = await this.payableRepository.release(payable.id, {
      releaseReason,
      releasedById: actor.memberId,
      proofStorageKey: storageKey,
      releaseNote: data.note,
    });

    await this.auditLogRepository.record({
      companyId: actor.companyId,
      actorId: actor.userId,
      eventType: AuditEventType.PAYABLE_RELEASED,
      entityType: 'payable',
      entityId: released.id,
      newData: {
        reason: releaseReason,
        amountCents: released.amountCents.toString(),
        note: data.note,
      },
    });

    return released;
  }
}
