import {
  ILlmClient,
  LlmCompletionResult,
  LlmUnavailableError,
} from 'src/shared/domain/llm.client';
import { ICategoryRepository } from 'src/modules/categories/domain/categories.repository.interface';
import { IStorageService } from 'src/shared/domain/storage.service';
import { ExtractionStatus } from '../domain/extraction.service';
import { IRequestFileRepository } from '../domain/request-files.repository.interface';
import { LlmExtractionService } from './llm-extraction.service';

const completionOf = (content: string): LlmCompletionResult => ({
  content,
  promptTokens: 10,
  completionTokens: 10,
});

const build = (
  complete: ILlmClient['complete'],
  categoryNames: string[] = [],
) => {
  const llmClient = { complete };
  const storageService = {} as IStorageService;
  const fileRepository = {} as IRequestFileRepository;
  const categoryRepository = {
    list: () => Promise.resolve(categoryNames.map((name) => ({ name }))),
  } as unknown as ICategoryRepository;

  return new LlmExtractionService(
    llmClient,
    storageService,
    fileRepository,
    categoryRepository,
  );
};

describe('LlmExtractionService', () => {
  it('extrai e normaliza os campos', async () => {
    const service = build(() =>
      Promise.resolve(
        completionOf(
          '{"supplierCnpj":"11.222.333/0001-81","supplierName":"Acme","totalAmountCents":"123456","categoryName":"Software","paymentTerms":"30 dias"}',
        ),
      ),
    );

    const result = await service.extract('company-1', { text: 'nota fiscal' });

    expect(result.status).toBe(ExtractionStatus.SUCCEEDED);
    expect(result.fields?.supplierCnpj).toBe('11222333000181');
    expect(result.fields?.totalAmountCents).toBe('123456');
  });

  it('provedor fora do ar não lança: devolve FAILED (RNF13)', async () => {
    const service = build(() =>
      Promise.reject(new LlmUnavailableError('timeout de 20000ms')),
    );

    const result = await service.extract('company-1', { text: 'nota' });

    expect(result.status).toBe(ExtractionStatus.FAILED);
    expect(result.fields).toBeNull();
    expect(result.failureReason).toContain('timeout');
    expect(result.retryable).toBe(true);
  });

  it('resposta malformada devolve FAILED em vez de dado inventado', async () => {
    const service = build(() =>
      Promise.resolve(completionOf('desculpe, não consegui ler o documento')),
    );

    const result = await service.extract('company-1', { text: 'nota' });

    expect(result.status).toBe(ExtractionStatus.FAILED);
    expect(result.fields).toBeNull();
  });

  it('JSON com campos ausentes vira null, nunca chute', async () => {
    const service = build(() =>
      Promise.resolve(completionOf('{"supplierName":"Acme"}')),
    );

    const result = await service.extract('company-1', { text: 'nota' });

    expect(result.status).toBe(ExtractionStatus.SUCCEEDED);
    expect(result.fields?.supplierName).toBe('Acme');
    expect(result.fields?.supplierCnpj).toBeNull();
    expect(result.fields?.totalAmountCents).toBeNull();
  });

  it('CNPJ com tamanho errado é descartado em vez de propagado', async () => {
    const service = build(() =>
      Promise.resolve(completionOf('{"supplierCnpj":"123"}')),
    );

    const result = await service.extract('company-1', { text: 'nota' });

    expect(result.fields?.supplierCnpj).toBeNull();
  });

  it('extrai o JSON mesmo com texto em volta', async () => {
    const service = build(() =>
      Promise.resolve(
        completionOf('Claro!\n```json\n{"supplierName":"Acme"}\n```'),
      ),
    );

    const result = await service.extract('company-1', { text: 'nota' });

    expect(result.status).toBe(ExtractionStatus.SUCCEEDED);
    expect(result.fields?.supplierName).toBe('Acme');
  });

  it('texto vazio falha sem chamar o provedor', async () => {
    const complete = jest.fn();
    const service = build(complete);

    const result = await service.extract('company-1', { text: '   ' });

    expect(result.status).toBe(ExtractionStatus.FAILED);
    expect(complete).not.toHaveBeenCalled();
  });

  it('erro inesperado do provedor não vaza: vira FAILED', async () => {
    const service = build(() => {
      throw new TypeError('boom');
    });

    const result = await service.extract('company-1', { text: 'nota' });

    expect(result.status).toBe(ExtractionStatus.FAILED);
  });

  it('texto curto sem preço vira item com quantidade e preço em aberto', async () => {
    const service = build(() =>
      Promise.resolve(
        completionOf(
          '{"title":"10 acessos do Claude Code","categoryName":"Software","items":[{"description":"Acesso mensal ao Claude Code","quantity":"10","unit":"acesso","unitPriceCents":null}]}',
        ),
      ),
    );

    const result = await service.extract('company-1', {
      text: 'Solicito 10 acessos mensais do claude code pra equipe de desenvolvimento',
    });

    expect(result.status).toBe(ExtractionStatus.SUCCEEDED);
    expect(result.fields?.title).toBe('10 acessos do Claude Code');
    expect(result.fields?.items).toEqual([
      {
        description: 'Acesso mensal ao Claude Code',
        quantity: '10',
        unit: 'acesso',
        unitPriceCents: null,
      },
    ]);
  });

  it('preço zero e quantidade ausente não viram dado falso', async () => {
    const service = build(() =>
      Promise.resolve(
        completionOf(
          '{"items":[{"description":"Headset","quantity":null,"unit":null,"unitPriceCents":"0"}]}',
        ),
      ),
    );

    const result = await service.extract('company-1', { text: 'headset' });

    expect(result.fields?.items).toEqual([
      {
        description: 'Headset',
        quantity: '1',
        unit: 'un',
        unitPriceCents: null,
      },
    ]);
  });

  it('resposta malformada não é tratada como falha passageira', async () => {
    const service = build(() => Promise.resolve(completionOf('sem json')));

    const result = await service.extract('company-1', { text: 'nota' });

    expect(result.retryable).toBe(false);
  });
});
