import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { detectMimeType } from 'src/shared/domain/file-signature';
import { IStorageService } from 'src/shared/domain/storage.service';
import { ValidationError } from 'src/shared/domain/errors/domain.error';
import { FeedbackEntity } from '../domain/feedback.entity';
import { IFeedbackRepository } from '../domain/feedbacks.repository.interface';
import { CreateFeedbackDto } from '../dto/create-feedback.dto';

const MAX_USER_AGENT = 300;
const MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024;

export interface FeedbackScreenshot {
  buffer: Buffer;
  declaredMimeType: string;
}

@Injectable()
export class SubmitFeedbackUseCase {
  constructor(
    private readonly feedbackRepository: IFeedbackRepository,
    private readonly storageService: IStorageService,
  ) {}

  async execute(
    companyId: string,
    authorId: string,
    data: CreateFeedbackDto,
    userAgent?: string,
    screenshot?: FeedbackScreenshot,
  ): Promise<FeedbackEntity> {
    let screenshotKey: string | null = null;
    let screenshotMime: string | null = null;
    let screenshotSize: number | null = null;

    if (screenshot) {
      if (screenshot.buffer.byteLength > MAX_SCREENSHOT_BYTES) {
        throw new ValidationError(
          'A imagem passa de 5 MB. Envie um recorte da tela em vez da tela inteira.',
        );
      }

      const detected = detectMimeType(screenshot.buffer);

      if (!detected || detected === 'application/pdf') {
        throw new ValidationError(
          'O anexo do feedback precisa ser uma imagem PNG, JPEG ou WEBP.',
        );
      }

      screenshotKey = `companies/${companyId}/feedback/${randomUUID()}`;
      screenshotMime = detected;
      screenshotSize = screenshot.buffer.byteLength;

      await this.storageService.upload({
        storageKey: screenshotKey,
        body: screenshot.buffer,
        mimeType: detected,
      });
    }

    return this.feedbackRepository.create({
      companyId,
      authorId,
      kind: data.kind,
      message: data.message.trim(),
      route: data.route?.trim() || null,
      userAgent: userAgent?.slice(0, MAX_USER_AGENT) ?? null,
      screenshotKey,
      screenshotMime,
      screenshotSizeBytes: screenshotSize,
    });
  }
}
