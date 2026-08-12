import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EnvSchema } from 'src/shared/config/env.schema';
import {
  ILlmClient,
  LlmCompletionInput,
  LlmCompletionResult,
  LlmUnavailableError,
} from 'src/shared/domain/llm.client';

interface DeepSeekChoice {
  message?: { content?: string };
}

interface DeepSeekUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
}

interface DeepSeekResponse {
  choices?: DeepSeekChoice[];
  usage?: DeepSeekUsage;
}

@Injectable()
export class DeepSeekLlmClient implements ILlmClient {
  private readonly logger = new Logger(DeepSeekLlmClient.name);

  constructor(private readonly configService: ConfigService<EnvSchema, true>) {}

  async complete(input: LlmCompletionInput): Promise<LlmCompletionResult> {
    const apiKey = this.configService.get('DEEPSEEK_API_KEY', { infer: true });

    if (!apiKey) {
      throw new LlmUnavailableError('DEEPSEEK_API_KEY não configurada');
    }

    const baseUrl = this.configService.get('DEEPSEEK_BASE_URL', {
      infer: true,
    });
    const model = this.configService.get('DEEPSEEK_MODEL', { infer: true });
    const timeoutMs =
      input.timeoutMs ??
      this.configService.get('AI_EXTRACTION_TIMEOUT_MS', { infer: true }) ??
      20000;

    let response: Response;

    try {
      response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: input.messages,
          max_tokens: input.maxTokens ?? 1024,
          temperature: 0,
          ...(input.jsonMode
            ? { response_format: { type: 'json_object' } }
            : {}),
        }),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (error) {
      const reason =
        error instanceof Error && error.name === 'TimeoutError'
          ? `timeout de ${timeoutMs}ms`
          : (error as Error).message;

      this.logger.warn(`Falha ao chamar DeepSeek: ${reason}`);
      throw new LlmUnavailableError(reason);
    }

    if (!response.ok) {
      this.logger.warn(`DeepSeek respondeu ${response.status}`);
      throw new LlmUnavailableError(`HTTP ${response.status}`);
    }

    let payload: DeepSeekResponse;

    try {
      payload = (await response.json()) as DeepSeekResponse;
    } catch {
      throw new LlmUnavailableError('resposta não é JSON válido');
    }

    const content = payload.choices?.[0]?.message?.content;

    if (typeof content !== 'string' || content.trim() === '') {
      throw new LlmUnavailableError('resposta sem conteúdo');
    }

    return {
      content,
      promptTokens: payload.usage?.prompt_tokens ?? 0,
      completionTokens: payload.usage?.completion_tokens ?? 0,
    };
  }
}
