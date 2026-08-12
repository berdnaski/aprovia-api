import { Injectable, Logger } from '@nestjs/common';
import { ILlmClient, LlmUnavailableError } from 'src/shared/domain/llm.client';
import { IStorageService } from 'src/shared/domain/storage.service';
import {
  EMPTY_EXTRACTION,
  ExtractedFields,
  ExtractionResult,
  ExtractionSource,
  ExtractionStatus,
  IExtractionService,
} from '../domain/extraction.service';
import { IRequestFileRepository } from '../domain/request-files.repository.interface';

const SYSTEM_PROMPT = `Você extrai dados de documentos de compra brasileiros.
Responda APENAS com JSON no formato:
{"supplierCnpj":string|null,"supplierName":string|null,"totalAmountCents":string|null,"categoryName":string|null,"paymentTerms":string|null}
Regras:
- supplierCnpj: apenas os 14 dígitos, sem máscara. null se não encontrar.
- totalAmountCents: o valor total em centavos, como string de dígitos. R$ 1.234,56 vira "123456". null se não encontrar.
- Nunca invente. Campo ausente no documento é null.`;

function asNullableString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}

function parseFields(content: string): ExtractedFields | null {
  const start = content.indexOf('{');
  const end = content.lastIndexOf('}');

  if (start === -1 || end === -1 || end <= start) {
    return null;
  }

  let payload: Record<string, unknown>;

  try {
    payload = JSON.parse(content.slice(start, end + 1)) as Record<
      string,
      unknown
    >;
  } catch {
    return null;
  }

  const cnpj = asNullableString(payload.supplierCnpj)?.replace(/\D/g, '');
  const amount = asNullableString(payload.totalAmountCents)?.replace(/\D/g, '');

  return {
    ...EMPTY_EXTRACTION,
    supplierCnpj: cnpj && cnpj.length === 14 ? cnpj : null,
    supplierName: asNullableString(payload.supplierName),
    totalAmountCents: amount && amount !== '' ? amount : null,
    categoryName: asNullableString(payload.categoryName),
    paymentTerms: asNullableString(payload.paymentTerms),
  };
}

@Injectable()
export class LlmExtractionService implements IExtractionService {
  private readonly logger = new Logger(LlmExtractionService.name);

  constructor(
    private readonly llmClient: ILlmClient,
    private readonly storageService: IStorageService,
    private readonly requestFileRepository: IRequestFileRepository,
  ) {}

  async extract(
    companyId: string,
    source: ExtractionSource,
  ): Promise<ExtractionResult> {
    let text = source.text ?? '';

    if (source.fileId) {
      const file = await this.requestFileRepository.findById(source.fileId);

      if (!file || file.companyId !== companyId) {
        return this.failed('Anexo não encontrado para extração');
      }

      try {
        const buffer = await this.storageService.getObject(file.storageKey);
        text = buffer.toString('utf8').slice(0, 20000);
      } catch (error) {
        return this.failed(
          `Não foi possível ler o anexo: ${(error as Error).message}`,
        );
      }
    }

    if (text.trim() === '') {
      return this.failed('Nada para extrair: documento vazio ou ilegível');
    }

    try {
      const completion = await this.llmClient.complete({
        jsonMode: true,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: text },
        ],
      });

      const fields = parseFields(completion.content);

      if (!fields) {
        return this.failed('Resposta do provedor não é um JSON esperado');
      }

      return {
        status: ExtractionStatus.SUCCEEDED,
        fields,
        failureReason: null,
        extractedAt: new Date(),
      };
    } catch (error) {
      if (error instanceof LlmUnavailableError) {
        return this.failed(error.message);
      }

      this.logger.error(`Falha inesperada na extração: ${String(error)}`);
      return this.failed('Falha inesperada na extração');
    }
  }

  private failed(reason: string): ExtractionResult {
    this.logger.warn(`Extração falhou: ${reason}`);

    return {
      status: ExtractionStatus.FAILED,
      fields: null,
      failureReason: reason,
      extractedAt: null,
    };
  }
}
