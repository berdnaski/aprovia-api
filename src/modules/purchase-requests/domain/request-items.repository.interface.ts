import { TransactionContext } from 'src/shared/domain/transaction.manager';
import { RequestItemEntity } from './request-item.entity';

export interface CreateRequestItemData {
  purchaseRequestId: string;
  description: string;
  quantity: string;
  unit: string;
  unitPriceCents: bigint;
  totalCents: bigint;
}

export interface UpdateRequestItemData {
  description?: string;
  quantity?: string;
  unit?: string;
  unitPriceCents?: bigint;
  totalCents?: bigint;
}

export abstract class IRequestItemRepository {
  abstract create(
    data: CreateRequestItemData,
    context?: TransactionContext,
  ): Promise<RequestItemEntity>;

  abstract createMany(
    items: CreateRequestItemData[],
    context?: TransactionContext,
  ): Promise<void>;

  abstract findById(
    id: string,
    context?: TransactionContext,
  ): Promise<RequestItemEntity | null>;

  abstract listByRequest(
    purchaseRequestId: string,
    context?: TransactionContext,
  ): Promise<RequestItemEntity[]>;

  abstract update(
    id: string,
    data: UpdateRequestItemData,
    context?: TransactionContext,
  ): Promise<RequestItemEntity>;

  abstract delete(id: string, context?: TransactionContext): Promise<void>;

  abstract sumTotal(
    purchaseRequestId: string,
    context?: TransactionContext,
  ): Promise<bigint>;
}
