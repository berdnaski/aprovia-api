import { DecisionChannel, DecisionType } from 'generated/prisma/enums';
import { TransactionContext } from 'src/shared/domain/transaction.manager';

export interface CreateDecisionData {
  approvalStepId: string;
  deciderId: string;
  onBehalfOfId: string | null;
  type: DecisionType;
  justification: string | null;
  budgetAtTimeCents: bigint;
  committedAtTimeCents: bigint;
  availableAtTimeCents: bigint;
  channel: DecisionChannel;
}

export abstract class IDecisionRepository {
  abstract create(
    data: CreateDecisionData,
    context?: TransactionContext,
  ): Promise<{ id: string }>;
}
