import { TransactionContext } from 'src/shared/domain/transaction.manager';
import { CostCenterMemberEntity } from './cost-center-member.entity';

export abstract class ICostCenterMemberRepository {
  abstract link(
    costCenterId: string,
    memberId: string,
    context?: TransactionContext,
  ): Promise<CostCenterMemberEntity>;

  abstract linkIfAbsent(
    costCenterId: string,
    memberId: string,
    context?: TransactionContext,
  ): Promise<void>;

  abstract unlink(costCenterId: string, memberId: string): Promise<void>;

  abstract findLink(
    costCenterId: string,
    memberId: string,
  ): Promise<CostCenterMemberEntity | null>;

  abstract listByCostCenter(
    costCenterId: string,
  ): Promise<CostCenterMemberEntity[]>;

  abstract listByMember(
    memberId: string,
    context?: TransactionContext,
  ): Promise<CostCenterMemberEntity[]>;
}
