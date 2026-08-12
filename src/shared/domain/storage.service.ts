import { AllowedMimeType } from './file-signature';

export interface StorageUploadInput {
  storageKey: string;
  body: Buffer;
  mimeType: AllowedMimeType;
}

export abstract class IStorageService {
  abstract upload(input: StorageUploadInput): Promise<void>;

  abstract getSignedDownloadUrl(
    storageKey: string,
    fileName: string,
    ttlSeconds?: number,
  ): Promise<string>;

  abstract getObject(storageKey: string): Promise<Buffer>;

  abstract delete(storageKey: string): Promise<void>;
}
