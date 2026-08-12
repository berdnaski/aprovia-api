import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { FileType } from 'generated/prisma/enums';
import { EntitlementsService } from 'src/modules/billing/application/entitlements.service';
import { StorageQuotaExceededError } from 'src/modules/billing/domain/billing.errors';
import { EnvSchema } from 'src/shared/config/env.schema';
import { NotFoundError } from 'src/shared/domain/errors/domain.error';
import {
  detectMimeType,
  isAllowedMimeType,
} from 'src/shared/domain/file-signature';
import { IStorageService } from 'src/shared/domain/storage.service';
import { RequestFileEntity } from '../domain/request-file.entity';
import { IRequestFileRepository } from '../domain/request-files.repository.interface';
import {
  FileTooLargeError,
  MimeTypeMismatchError,
  UnsupportedFileTypeError,
} from '../domain/purchase-requests.errors';
import {
  FindRequestByIdUseCase,
  RequestActor,
} from './find-request-by-id.use-case';

export interface UploadFileInput {
  fileName: string;
  declaredMimeType: string;
  buffer: Buffer;
}

@Injectable()
export class ManageRequestFilesUseCase {
  constructor(
    private readonly requestFileRepository: IRequestFileRepository,
    private readonly findRequestByIdUseCase: FindRequestByIdUseCase,
    private readonly storageService: IStorageService,
    private readonly configService: ConfigService<EnvSchema, true>,
    private readonly entitlementsService: EntitlementsService,
  ) {}

  async upload(
    requestId: string,
    actor: RequestActor,
    input: UploadFileInput,
  ): Promise<RequestFileEntity> {
    await this.findRequestByIdUseCase.executeAsOwnerDraft(requestId, actor);

    const maxBytes =
      this.configService.get('UPLOAD_MAX_SIZE_BYTES', { infer: true }) ??
      10485760;

    if (input.buffer.byteLength > maxBytes) {
      throw new FileTooLargeError(input.buffer.byteLength, maxBytes);
    }

    const detected = detectMimeType(input.buffer);

    if (!detected) {
      throw new UnsupportedFileTypeError(input.declaredMimeType);
    }

    if (
      isAllowedMimeType(input.declaredMimeType) &&
      input.declaredMimeType !== detected
    ) {
      throw new MimeTypeMismatchError(input.declaredMimeType, detected);
    }

    const { maxStorageBytes } = await this.entitlementsService.forCompany(
      actor.companyId,
    );

    if (maxStorageBytes !== null) {
      const usedBytes = await this.requestFileRepository.sumSizeByCompany(
        actor.companyId,
      );

      if (usedBytes + BigInt(input.buffer.byteLength) > maxStorageBytes) {
        throw new StorageQuotaExceededError(usedBytes, maxStorageBytes);
      }
    }

    const storageKey = `companies/${actor.companyId}/requests/${requestId}/${randomUUID()}`;

    await this.storageService.upload({
      storageKey,
      body: input.buffer,
      mimeType: detected,
    });

    return this.requestFileRepository.create({
      companyId: actor.companyId,
      type: FileType.REQUEST_ATTACHMENT,
      purchaseRequestId: requestId,
      fileName: input.fileName,
      mimeType: detected,
      sizeBytes: BigInt(input.buffer.byteLength),
      storageKey,
      uploadedById: actor.userId,
    });
  }

  async list(
    requestId: string,
    actor: RequestActor,
  ): Promise<RequestFileEntity[]> {
    await this.findRequestByIdUseCase.execute(requestId, actor);

    return this.requestFileRepository.listByRequest(requestId);
  }

  async getDownloadUrl(
    requestId: string,
    fileId: string,
    actor: RequestActor,
  ): Promise<string> {
    await this.findRequestByIdUseCase.execute(requestId, actor);

    const file = await this.requestFileRepository.findById(fileId);

    if (!file || file.purchaseRequestId !== requestId) {
      throw new NotFoundError('Anexo', fileId);
    }

    return this.storageService.getSignedDownloadUrl(
      file.storageKey,
      file.fileName,
    );
  }

  async remove(
    requestId: string,
    fileId: string,
    actor: RequestActor,
  ): Promise<void> {
    await this.findRequestByIdUseCase.executeAsOwnerDraft(requestId, actor);

    const file = await this.requestFileRepository.findById(fileId);

    if (!file || file.purchaseRequestId !== requestId) {
      throw new NotFoundError('Anexo', fileId);
    }

    await this.requestFileRepository.delete(fileId);
    await this.storageService.delete(file.storageKey).catch(() => undefined);
  }
}
