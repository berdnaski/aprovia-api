import { Injectable } from '@nestjs/common';
import { IAbsenceHandover } from '../absence-handover';

@Injectable()
export class AbsenceHandoverRegistry {
  private readonly handovers: IAbsenceHandover[] = [];

  register(handover: IAbsenceHandover): void {
    if (!this.handovers.includes(handover)) {
      this.handovers.push(handover);
    }
  }

  async handOverAll(
    companyId: string,
    fromMemberId: string,
    toMemberId: string,
  ): Promise<number> {
    let moved = 0;

    for (const handover of this.handovers) {
      moved += await handover.handOver(companyId, fromMemberId, toMemberId);
    }

    return moved;
  }
}
