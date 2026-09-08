import { Injectable, Logger } from '@nestjs/common';
import { IStorageService } from 'src/shared/domain/storage.service';

@Injectable()
export class StorageCleanupService {
  private readonly logger = new Logger(StorageCleanupService.name);

  constructor(private readonly storageService: IStorageService) {}

  async remove(storageKey: string | null | undefined): Promise<boolean> {
    if (!storageKey) {
      return true;
    }

    try {
      await this.storageService.delete(storageKey);
      return true;
    } catch (error) {
      this.logger.error(
        `Objeto órfão no storage: falha ao remover "${storageKey}". ${
          (error as Error).message
        }`,
        (error as Error).stack,
      );
      return false;
    }
  }

  async removeMany(
    storageKeys: readonly (string | null | undefined)[],
  ): Promise<{ removed: number; orphaned: number }> {
    const results = await Promise.all(
      storageKeys.map((key) => this.remove(key)),
    );

    const removed = results.filter(Boolean).length;

    return { removed, orphaned: results.length - removed };
  }
}
