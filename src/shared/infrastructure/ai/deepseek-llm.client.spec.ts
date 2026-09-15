import { ConfigService } from '@nestjs/config';
import { EnvSchema } from 'src/shared/config/env.schema';
import { DeepSeekLlmClient } from './deepseek-llm.client';

const settings: Record<string, unknown> = {
  DEEPSEEK_API_KEY: 'test-key',
  DEEPSEEK_BASE_URL: 'https://deepseek.test',
  DEEPSEEK_MODEL: 'deepseek-chat',
  AI_EXTRACTION_TIMEOUT_MS: 45000,
};

const config = {
  get: (key: string) => settings[key],
} as unknown as ConfigService<EnvSchema, true>;

function timeoutError(): Error {
  const error = new Error('The operation was aborted due to timeout');
  error.name = 'TimeoutError';
  return error;
}

function mockFetch(implementation: () => Promise<unknown>) {
  global.fetch = jest.fn(implementation) as unknown as typeof fetch;
}

const input = { messages: [{ role: 'user' as const, content: 'oi' }] };

describe('DeepSeekLlmClient', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('corte no meio da resposta vira timeout, não JSON inválido', async () => {
    mockFetch(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.reject(timeoutError()),
      }),
    );

    await expect(new DeepSeekLlmClient(config).complete(input)).rejects.toThrow(
      'Provedor de IA indisponível: timeout de 45000ms',
    );
  });

  it('demora antes do cabeçalho também vira timeout', async () => {
    mockFetch(() => Promise.reject(timeoutError()));

    await expect(new DeepSeekLlmClient(config).complete(input)).rejects.toThrow(
      'timeout de 45000ms',
    );
  });

  it('corpo quebrado continua sendo JSON inválido', async () => {
    mockFetch(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.reject(new SyntaxError('Unexpected token')),
      }),
    );

    await expect(new DeepSeekLlmClient(config).complete(input)).rejects.toThrow(
      'resposta não é JSON válido',
    );
  });
});
