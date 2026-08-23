import { TransactionContext } from 'src/shared/domain/transaction.manager';
import { CostCenterEntity } from './cost-center.entity';

export interface CreateCostCenterData {
  companyId: string;
  name: string;
  code: string | null;
  managerId: string;
  parentId: string | null;
}

export interface UpdateCostCenterData {
  name?: string;
  code?: string | null;
  managerId?: string;
  parentId?: string | null;
}

export interface ListCostCentersFilter {
  includeDisabled?: boolean;
  parentId?: string | null;
  search?: string;
  managerId?: string;
}

export interface CostCenterUsage {
  purchaseRequests: number;
  budgets: number;
  linkedMembers: number;
  children: number;
  defaultOfMembers: number;
  approvalRules: number;
}

export type CostCenterUsageKind = keyof CostCenterUsage;

export const COST_CENTER_USAGE_KINDS: readonly CostCenterUsageKind[] = [
  'purchaseRequests',
  'budgets',
  'linkedMembers',
  'children',
  'defaultOfMembers',
  'approvalRules',
];

export abstract class ICostCenterRepository {
  abstract create(
    data: CreateCostCenterData,
    context?: TransactionContext,
  ): Promise<CostCenterEntity>;

  abstract findById(
    id: string,
    context?: TransactionContext,
  ): Promise<CostCenterEntity | null>;

  abstract list(
    companyId: string,
    filter?: ListCostCentersFilter,
  ): Promise<CostCenterEntity[]>;

  abstract listManagedBy(
    managerId: string,
    context?: TransactionContext,
  ): Promise<CostCenterEntity[]>;

  abstract countActiveChildren(
    parentId: string,
    context?: TransactionContext,
  ): Promise<number>;

  abstract findUsage(
    id: string,
    context?: TransactionContext,
  ): Promise<CostCenterUsage>;

  abstract update(
    id: string,
    data: UpdateCostCenterData,
    context?: TransactionContext,
  ): Promise<CostCenterEntity>;

  abstract disable(id: string, context?: TransactionContext): Promise<void>;

  abstract delete(id: string, context?: TransactionContext): Promise<void>;

  abstract reassignManager(
    fromManagerId: string,
    toManagerId: string,
    context?: TransactionContext,
  ): Promise<void>;
}
