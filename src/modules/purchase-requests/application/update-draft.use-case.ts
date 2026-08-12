import { Injectable } from '@nestjs/common';
import { FindCategoryByIdUseCase } from 'src/modules/categories/application/find-category-by-id.use-case';
import { InactiveCategoryError } from 'src/modules/categories/domain/categories.errors';
import { FindCostCenterByIdUseCase } from 'src/modules/cost-centers/application/find-cost-center-by-id.use-case';
import { FindSupplierByIdUseCase } from 'src/modules/suppliers/application/find-supplier-by-id.use-case';
import { ValidationError } from 'src/shared/domain/errors/domain.error';
import { PurchaseRequestEntity } from '../domain/purchase-request.entity';
import { IPurchaseRequestRepository } from '../domain/purchase-requests.repository.interface';
import { UpdateDraftDto } from '../dto/update-draft.dto';
import {
  FindRequestByIdUseCase,
  RequestActor,
} from './find-request-by-id.use-case';

@Injectable()
export class UpdateDraftUseCase {
  constructor(
    private readonly purchaseRequestRepository: IPurchaseRequestRepository,
    private readonly findRequestByIdUseCase: FindRequestByIdUseCase,
    private readonly findCostCenterByIdUseCase: FindCostCenterByIdUseCase,
    private readonly findCategoryByIdUseCase: FindCategoryByIdUseCase,
    private readonly findSupplierByIdUseCase: FindSupplierByIdUseCase,
  ) {}

  async execute(
    id: string,
    actor: RequestActor,
    data: UpdateDraftDto,
  ): Promise<PurchaseRequestEntity> {
    await this.findRequestByIdUseCase.executeAsOwnerDraft(id, actor);

    if (data.costCenterId) {
      const costCenter = await this.findCostCenterByIdUseCase.execute(
        data.costCenterId,
        actor.companyId,
      );

      if (costCenter.disabledAt) {
        throw new ValidationError(
          'Não é possível vincular o pedido a um Centro de Custo inativo (RN13)',
        );
      }
    }

    if (data.categoryId) {
      const category = await this.findCategoryByIdUseCase.execute(
        data.categoryId,
        actor.companyId,
      );

      if (!category.active) {
        throw new InactiveCategoryError();
      }
    }

    if (data.supplierId) {
      await this.findSupplierByIdUseCase.execute(
        data.supplierId,
        actor.companyId,
      );
    }

    return this.purchaseRequestRepository.update(id, {
      costCenterId: data.costCenterId,
      categoryId: data.categoryId,
      supplierId: data.supplierId,
      title: data.title,
      description: data.description,
      urgency: data.urgency,
      paymentTerms: data.paymentTerms,
    });
  }
}
