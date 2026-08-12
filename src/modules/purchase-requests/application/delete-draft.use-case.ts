import { Injectable } from '@nestjs/common';
import { IStorageService } from 'src/shared/domain/storage.service';
import { ITransactionManager } from 'src/shared/domain/transaction.manager';
import { IRequestFileRepository } from '../domain/request-files.repository.interface';
import { IPurchaseRequestRepository } from '../domain/purchase-requests.repository.interface';
import {
  FindRequestByIdUseCase,
  RequestActor,
} from './find-request-by-id.use-case';

@Injectable()
export class DeleteDraftUseCase {
  constructor(
    private readonly purchaseRequestRepository: IPurchaseRequestRepository,
    private readonly requestFileRepository: IRequestFileRepository,
    private readonly findRequestByIdUseCase: FindRequestByIdUseCase,
    private readonly storageService: IStorageService,
    private readonly transactionManager: ITransactionManager,
  ) {}

  async execute(id: string, actor: RequestActor): Promise<void> {
    await this.findRequestByIdUseCase.executeAsOwnerDraft(id, actor);

    const files = await this.requestFileRepository.listByRequest(id);

    await this.transactionManager.run(async (context) => {
      await this.purchaseRequestRepository.delete(id, context);
    });

    for (const file of files) {
      await this.storageService.delete(file.storageKey).catch(() => undefined);
    }
  }
}
