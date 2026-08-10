import { Injectable } from '@nestjs/common';
import { CompanyMemberEntity } from '../company-member.entity';
import { ICompanyMemberRepository } from '../company-members.repository.interface';
import { HierarchyCycleError } from '../companies.errors';

@Injectable()
export class HierarchyService {
  constructor(
    private readonly companyMemberRepository: ICompanyMemberRepository,
  ) {}

  async assertNoCycle(memberId: string, managerId: string): Promise<void> {
    const visited = new Set<string>([memberId]);
    let currentId: string | null = managerId;

    while (currentId) {
      if (visited.has(currentId)) {
        throw new HierarchyCycleError();
      }

      visited.add(currentId);

      const current: CompanyMemberEntity | null =
        await this.companyMemberRepository.findById(currentId);

      currentId = current?.managerId ?? null;
    }
  }
}
