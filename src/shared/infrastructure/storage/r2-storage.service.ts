import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EnvSchema } from 'src/shared/config/env.schema';
import {
  IStorageService,
  StorageUploadInput,
} from 'src/shared/domain/storage.service';

@Injectable()
export class R2StorageService implements IStorageService {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly defaultTtlSeconds: number;

  constructor(private readonly configService: ConfigService<EnvSchema, true>) {
    const accountId = this.configService.get('R2_ACCOUNT_ID', { infer: true });

    this.bucket = this.configService.get('R2_BUCKET', { infer: true });
    this.defaultTtlSeconds = this.configService.get(
      'R2_SIGNED_URL_TTL_SECONDS',
      { infer: true },
    );

    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: this.configService.get('R2_ACCESS_KEY_ID', {
          infer: true,
        }),
        secretAccessKey: this.configService.get('R2_SECRET_ACCESS_KEY', {
          infer: true,
        }),
      },
    });
  }

  async upload(input: StorageUploadInput): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: input.storageKey,
        Body: input.body,
        ContentType: input.mimeType,
      }),
    );
  }

  getSignedDownloadUrl(
    storageKey: string,
    fileName: string,
    ttlSeconds?: number,
  ): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: storageKey,
      ResponseContentDisposition: `attachment; filename="${encodeURIComponent(fileName)}"`,
    });

    return getSignedUrl(this.client, command, {
      expiresIn: ttlSeconds ?? this.defaultTtlSeconds,
    });
  }

  async getObject(storageKey: string): Promise<Buffer> {
    const result = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: storageKey }),
    );

    const bytes = await result.Body?.transformToByteArray();

    if (!bytes) {
      throw new Error(`Objeto vazio no storage: ${storageKey}`);
    }

    return Buffer.from(bytes);
  }

  async delete(storageKey: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: storageKey }),
    );
  }
}
