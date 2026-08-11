import { Injectable } from '@nestjs/common';
import { TransactionContext } from 'src/shared/domain/transaction.manager';
import {
  IMemberResponsibilityGuard,
  MemberAction,
  ResponsibilityBlocker,
} from '../member-responsibility-guard';

@Injectable()
export class MemberResponsibilityRegistry {
  private readonly guards: IMemberResponsibilityGuard[] = [];

  register(guard: IMemberResponsibilityGuard): void {
    if (!this.guards.includes(guard)) {
      this.guards.push(guard);
    }
  }

  async collectBlockers(
    memberId: string,
    companyId: string,
    action: MemberAction,
    context?: TransactionContext,
  ): Promise<ResponsibilityBlocker[]> {
    const blockers: ResponsibilityBlocker[] = [];

    for (const guard of this.guards) {
      if (!guard.blocks.includes(action)) {
        continue;
      }

      const blocker = await guard.check(memberId, companyId, context);

      if (blocker && blocker.items.length > 0) {
        blockers.push(blocker);
      }
    }

    return blockers;
  }
}
