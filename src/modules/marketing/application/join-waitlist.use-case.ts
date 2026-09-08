import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { isUniqueViolation } from 'src/shared/domain/prisma-error';
import { IMailService } from 'src/shared/mail/application/mail.service';
import { waitlistJoinedTemplate } from 'src/shared/mail/templates/marketing.templates';
import { IWaitlistRepository } from '../domain/waitlist.repository.interface';
import { JoinWaitlistDto } from '../dto/join-waitlist.dto';

export interface WaitlistJoinResult {
  alreadyOnList: boolean;
}

@Injectable()
export class JoinWaitlistUseCase {
  private readonly logger = new Logger(JoinWaitlistUseCase.name);

  constructor(
    private readonly waitlistRepository: IWaitlistRepository,
    private readonly mailService: IMailService,
    private readonly configService: ConfigService,
  ) {}

  async execute(data: JoinWaitlistDto): Promise<WaitlistJoinResult> {
    const existing = await this.waitlistRepository.findByEmail(data.email);

    if (existing) {
      return { alreadyOnList: true };
    }

    try {
      await this.waitlistRepository.create({
        email: data.email,
        name: data.name?.trim() || null,
        phone: data.phone?.trim() || null,
        company: data.company?.trim() || null,
        source: data.source?.trim() || null,
      });
    } catch (error) {
      if (!isUniqueViolation(error)) {
        throw error;
      }

      return { alreadyOnList: true };
    }

    await this.sendConfirmation(
      data.email,
      data.name?.trim() || null,
      Boolean(data.phone?.trim()),
    );

    return { alreadyOnList: false };
  }

  private async sendConfirmation(
    to: string,
    name: string | null,
    hasPhone: boolean,
  ): Promise<void> {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') ?? '';
    const template = waitlistJoinedTemplate(
      name,
      `${frontendUrl}/privacidade`,
      hasPhone,
    );

    try {
      await this.mailService.send({ to, ...template });
    } catch (error) {
      this.logger.error(
        `Falha ao enviar a confirmação da lista de espera para ${to}: ${
          (error as Error).message
        }`,
      );
    }
  }
}
