import { FileType } from 'generated/prisma/enums';

export class RequestFileEntity {
  id: string;
  companyId: string;
  type: FileType;
  purchaseRequestId: string | null;
  userId: string | null;
  fileName: string;
  mimeType: string;
  sizeBytes: bigint;
  storageKey: string;
  uploadedById: string;
  uploadedAt: Date;
}
