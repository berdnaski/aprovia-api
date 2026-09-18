import { Injectable } from '@nestjs/common';
import { FindCategoryByIdUseCase } from 'src/modules/categories/application/find-category-by-id.use-case';
import { InactiveCategoryError } from 'src/modules/categories/domain/categories.errors';
import { FindCostCenterByIdUseCase } from 'src/modules/cost-centers/application/find-cost-center-by-id.use-case';
import { CostCenterAccessService } from 'src/modules/cost-centers/domain/services/cost-center-access.service';
import { FindSupplierByIdUseCase } from 'src/modules/suppliers/application/find-supplier-by-id.use-case';
import { ValidationError } from 'src/shared/domain/errors/domain.error';
import { ITransactionManager } from 'src/shared/domain/transaction.manager';
import { PurchaseRequestEntity } from '../domain/purchase-request.entity';
import { IPurchaseRequestRepository } from '../domain/purchase-requests.repository.interface';
import { IRequestAllocationRepository } from '../domain/request-allocations.repository.interface';
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
    private readonly costCenterAccessService: CostCenterAccessService,
    private readonly findCategoryByIdUseCase: FindCategoryByIdUseCase,
    private readonly findSupplierByIdUseCase: FindSupplierByIdUseCase,
    private readonly requestAllocationRepository: IRequestAllocationRepository,
    private readonly transactionManager: ITransactionManager,
  ) {}

  async execute(
    id: string,
    actor: RequestActor,
    data: UpdateDraftDto,
  ): Promise<PurchaseRequestEntity> {
    const current = await this.findRequestByIdUseCase.executeAsOwnerDraft(
      id,
      actor,
    );

    if (data.costCenterId) {
      const costCenter = await this.findCostCenterByIdUseCase.execute(
        data.costCenterId,
        actor.companyId,
      );

      if (costCenter.disabledAt) {
        throw new ValidationError(
          'Este Centro de Custo está inativo e não aceita novos pedidos.',
        );
      }

      await this.costCenterAccessService.assertCanRequest(
        costCenter,
        actor.memberId,
        actor.role,
      );
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

    return this.transactionManager.run(async (context) => {
      if (data.costCenterId && data.costCenterId !== current.costCenterId) {
        const allocations =
          await this.requestAllocationRepository.listByRequest(id, context);

        if (
          !allocations.some((line) => line.costCenterId === data.costCenterId)
        ) {
          await this.requestAllocationRepository.deleteByRequest(id, context);
        }
      }

      return this.purchaseRequestRepository.update(
        id,
        {
          costCenterId: data.costCenterId,
          categoryId: data.categoryId,
          supplierId: data.supplierId,
          title: data.title,
          description: data.description,
          urgency: data.urgency,
          paymentTerms: data.paymentTerms,
        },
        context,
      );
    });
  }
}
