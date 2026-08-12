import { Injectable } from '@nestjs/common';
import { TransactionContext } from 'src/shared/domain/transaction.manager';
import { SupplierEntity } from '../domain/supplier.entity';
import {
  SupplierNotApprovableError,
  SupplierNotSubmittableError,
} from '../domain/suppliers.errors';
import {
  evaluateSupplier,
  SupplierUsage,
} from '../domain/services/supplier-eligibility.service';
import { FindSupplierByIdUseCase } from './find-supplier-by-id.use-case';

@Injectable()
export class AssertSupplierUsableUseCase {
  constructor(
    private readonly findSupplierByIdUseCase: FindSupplierByIdUseCase,
  ) {}

  async forSubmission(
    supplierId: string,
    companyId: string,
    context?: TransactionContext,
  ): Promise<SupplierEntity> {
    const supplier = await this.findSupplierByIdUseCase.execute(
      supplierId,
      companyId,
      context,
    );

    const eligibility = evaluateSupplier(supplier);

    if (eligibility.usage === SupplierUsage.BLOCKS_SUBMISSION) {
      throw new SupplierNotSubmittableError(
        supplier.cnpj,
        eligibility.reason ?? 'fornecedor inelegível',
      );
    }

    return supplier;
  }

  async forApproval(
    supplierId: string,
    companyId: string,
    context?: TransactionContext,
  ): Promise<SupplierEntity> {
    const supplier = await this.findSupplierByIdUseCase.execute(
      supplierId,
      companyId,
      context,
    );

    const eligibility = evaluateSupplier(supplier);

    if (eligibility.usage === SupplierUsage.BLOCKS_SUBMISSION) {
      throw new SupplierNotSubmittableError(
        supplier.cnpj,
        eligibility.reason ?? 'fornecedor inelegível',
      );
    }

    if (eligibility.usage === SupplierUsage.BLOCKS_APPROVAL) {
      throw new SupplierNotApprovableError(
        supplier.cnpj,
        eligibility.reason ?? 'fornecedor pendente de validação',
      );
    }

    return supplier;
  }
}
