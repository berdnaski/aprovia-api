import { Global, Module } from '@nestjs/common';
import { IStorageService } from 'src/shared/domain/storage.service';
import { R2StorageService } from './r2-storage.service';

@Global()
@Module({
  providers: [{ provide: IStorageService, useClass: R2StorageService }],
  exports: [IStorageService],
})
export class StorageModule {}
