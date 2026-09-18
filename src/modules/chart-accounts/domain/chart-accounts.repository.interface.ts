import { ChartAccountKind } from 'generated/prisma/enums';
import { TransactionContext } from 'src/shared/domain/transaction.manager';
import { ChartAccountEntity } from './chart-account.entity';

export interface CreateChartAccountData {
  companyId: string;
  parentId: string | null;
  code: string;
  name: string;
  kind: ChartAccountKind;
  postable: boolean;
  externalCode: string | null;
}

export interface UpdateChartAccountData {
  name?: string;
  externalCode?: string | null;
  postable?: boolean;
}

export interface ListChartAccountsFilter {
  includeInactive?: boolean;
}

export abstract class IChartAccountRepository {
  abstract create(
    data: CreateChartAccountData,
    context?: TransactionContext,
  ): Promise<ChartAccountEntity>;

  abstract findById(
    id: string,
    context?: TransactionContext,
  ): Promise<ChartAccountEntity | null>;

  abstract findByIds(
    companyId: string,
    ids: string[],
    context?: TransactionContext,
  ): Promise<ChartAccountEntity[]>;

  abstract list(
    companyId: string,
    filter?: ListChartAccountsFilter,
    context?: TransactionContext,
  ): Promise<ChartAccountEntity[]>;

  abstract hasChart(
    companyId: string,
    context?: TransactionContext,
  ): Promise<boolean>;

  abstract countActiveChildren(
    id: string,
    context?: TransactionContext,
  ): Promise<number>;

  abstract update(
    id: string,
    data: UpdateChartAccountData,
    context?: TransactionContext,
  ): Promise<ChartAccountEntity>;

  abstract assignCategoryDefaults(
    companyId: string,
    accountIdByCategoryName: ReadonlyMap<string, string>,
    context?: TransactionContext,
  ): Promise<number>;

  abstract setActive(
    id: string,
    active: boolean,
    context?: TransactionContext,
  ): Promise<ChartAccountEntity>;
}
