import { Injectable } from '@nestjs/common';
import { NotFoundError } from 'src/shared/domain/errors/domain.error';
import { IStorageService } from 'src/shared/domain/storage.service';
import { IBudgetDocumentRepository } from '../domain/budget-documents.repository.interface';
import { FindBudgetByIdUseCase } from './find-budget-by-id.use-case';

@Injectable()
export class GetBudgetDocumentDownloadUrlUseCase {
  constructor(
    private readonly budgetDocumentRepository: IBudgetDocumentRepository,
    private readonly findBudgetByIdUseCase: FindBudgetByIdUseCase,
    private readonly storageService: IStorageService,
  ) {}

  async execute(
    budgetId: string,
    documentId: string,
    companyId: string,
  ): Promise<string> {
    await this.findBudgetByIdUseCase.execute(budgetId, companyId);

    const document = await this.budgetDocumentRepository.findById(documentId);

    if (!document || document.budgetId !== budgetId) {
      throw new NotFoundError('Documento', documentId);
    }

    return this.storageService.getSignedDownloadUrl(
      document.storageKey,
      document.fileName,
    );
  }
}
