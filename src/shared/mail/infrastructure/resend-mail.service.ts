import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { IMailService, SendMailInput } from '../application/mail.service';
import { toPlainText } from '../templates/base.template';

@Injectable()
export class ResendMailService implements IMailService, OnModuleInit {
  private readonly logger = new Logger(ResendMailService.name);
  private client: Resend | null = null;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit(): void {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');

    if (!apiKey) {
      this.logger.warn(
        'RESEND_API_KEY ausente: e-mails serão apenas registrados no log.',
      );
      return;
    }

    this.client = new Resend(apiKey);
  }

  async send(input: SendMailInput): Promise<void> {
    const from = this.configService.get<string>(
      'MAIL_FROM',
      'AprovAI <onboarding@resend.dev>',
    );

    if (!this.client) {
      this.logFallback(input);
      return;
    }

    const { error } = await this.client.emails.send({
      from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text ?? toPlainText(input.html),
    });

    if (error) {
      this.logger.error(
        `Falha ao enviar "${input.subject}" para ${input.to}: ${error.message}`,
      );
      throw new Error(`Mail delivery failed: ${error.message}`);
    }

    this.logger.log(`E-mail "${input.subject}" enviado para ${input.to}`);
  }

  private logFallback(input: SendMailInput): void {
    const links = /href="([^"]+)"/g;
    const urls = [...input.html.matchAll(links)].map((match) => match[1]);

    this.logger.debug(
      [
        '',
        '──────── E-MAIL (modo log) ────────',
        `Para:     ${input.to}`,
        `Assunto:  ${input.subject}`,
        urls.length ? `Links:    ${urls.join('\n          ')}` : '',
        '───────────────────────────────────',
      ]
        .filter(Boolean)
        .join('\n'),
    );
  }
}
