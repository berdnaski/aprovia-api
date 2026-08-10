import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  passwordChangedTemplate,
  passwordChangeTemplate,
  passwordResetTemplate,
  verifyEmailTemplate,
} from '../templates/auth.templates';
import { IMailService } from './mail.service';

@Injectable()
export class AuthMailService {
  constructor(
    private readonly mailService: IMailService,
    private readonly configService: ConfigService,
  ) {}

  async sendEmailVerification(
    to: string,
    name: string,
    token: string,
  ): Promise<void> {
    const template = verifyEmailTemplate(
      name,
      this.buildUrl('/verify-email', token),
    );
    await this.mailService.send({ to, ...template });
  }

  async sendPasswordReset(
    to: string,
    name: string,
    token: string,
  ): Promise<void> {
    const template = passwordResetTemplate(
      name,
      this.buildUrl('/reset-password', token),
    );
    await this.mailService.send({ to, ...template });
  }

  async sendPasswordChangeConfirmation(
    to: string,
    name: string,
    token: string,
  ): Promise<void> {
    const template = passwordChangeTemplate(
      name,
      this.buildUrl('/confirm-password-change', token),
    );
    await this.mailService.send({ to, ...template });
  }

  async sendPasswordChanged(to: string, name: string): Promise<void> {
    const template = passwordChangedTemplate(name);
    await this.mailService.send({ to, ...template });
  }

  private buildUrl(path: string, token: string): string {
    const baseUrl = this.configService.get<string>(
      'FRONTEND_URL',
      'http://localhost:5173',
    );
    return `${baseUrl}${path}?token=${token}`;
  }
}
