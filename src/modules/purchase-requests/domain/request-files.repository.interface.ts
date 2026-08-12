import { FileType } from 'generated/prisma/enums';
import { TransactionContext } from 'src/shared/domain/transaction.manager';
import { RequestFileEntity } from './request-file.entity';

export interface CreateRequestFileData {
  companyId: string;
  type: FileType;
  purchaseRequestId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: bigint;
  storageKey: string;
  uploadedById: string;
}

export abstract class IRequestFileRepository {
  abstract create(
    data: CreateRequestFileData,
    context?: TransactionContext,
  ): Promise<RequestFileEntity>;

  abstract findById(id: string): Promise<RequestFileEntity | null>;

  abstract listByRequest(
    purchaseRequestId: string,
  ): Promise<RequestFileEntity[]>;

  abstract delete(id: string, context?: TransactionContext): Promise<void>;

  abstract sumSizeByCompany(companyId: string): Promise<bigint>;
}
