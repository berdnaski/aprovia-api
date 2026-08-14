import { Injectable } from '@nestjs/common';
import { MatchResultEntity } from '../domain/match-result.entity';
import { MatchResultNotFoundError } from '../domain/matching.errors';
import { IMatchResultRepository } from '../domain/matching.repository.interface';

@Injectable()
export class FindMatchResultByIdUseCase {
  constructor(
    private readonly matchResultRepository: IMatchResultRepository,
  ) {}

  async execute(id: string, companyId: string): Promise<MatchResultEntity> {
    const match = await this.matchResultRepository.findById(id, companyId);

    if (!match) {
      throw new MatchResultNotFoundError();
    }

    return match;
  }
}
