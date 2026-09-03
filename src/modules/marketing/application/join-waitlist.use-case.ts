import { Injectable } from '@nestjs/common';
import { isUniqueViolation } from 'src/shared/domain/prisma-error';
import { IWaitlistRepository } from '../domain/waitlist.repository.interface';
import { JoinWaitlistDto } from '../dto/join-waitlist.dto';

export interface WaitlistJoinResult {
  position: number;
  alreadyOnList: boolean;
}

@Injectable()
export class JoinWaitlistUseCase {
  constructor(private readonly waitlistRepository: IWaitlistRepository) {}

  async execute(data: JoinWaitlistDto): Promise<WaitlistJoinResult> {
    const existing = await this.waitlistRepository.findByEmail(data.email);

    if (existing) {
      return {
        position: await this.waitlistRepository.count(),
        alreadyOnList: true,
      };
    }

    try {
      await this.waitlistRepository.create({
        email: data.email,
        name: data.name?.trim() || null,
        company: data.company?.trim() || null,
        source: data.source?.trim() || null,
      });
    } catch (error) {
      if (!isUniqueViolation(error)) {
        throw error;
      }

      return {
        position: await this.waitlistRepository.count(),
        alreadyOnList: true,
      };
    }

    return {
      position: await this.waitlistRepository.count(),
      alreadyOnList: false,
    };
  }
}
