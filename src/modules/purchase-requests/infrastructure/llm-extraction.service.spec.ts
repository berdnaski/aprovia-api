import {
  ILlmClient,
  LlmCompletionResult,
  LlmUnavailableError,
} from 'src/shared/domain/llm.client';
import { ICategoryRepository } from 'src/modules/categories/domain/categories.repository.interface';
import { ICostCenterRepository } from 'src/modules/cost-centers/domain/cost-centers.repository.interface';
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
  costCenterNames: string[] = [],
) => {
  const llmClient = { complete };
  const storageService = {} as IStorageService;
  const fileRepository = {} as IRequestFileRepository;
  const categoryRepository = {
    list: () => Promise.resolve(categoryNames.map((name) => ({ name }))),
  } as unknown as ICategoryRepository;
  const costCenterRepository = {
    list: () => Promise.resolve(costCenterNames.map((name) => ({ name }))),
  } as unknown as ICostCenterRepository;

  return new LlmExtractionService(
    llmClient,
    storageService,
    fileRepository,
    categoryRepository,
    costCenterRepository,
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

  it('oferece os Centros de Custo da empresa para a leitura escolher', async () => {
    let sent = '';

    const service = build(
      (request) => {
        sent = request.messages[0].content;
        return Promise.resolve(completionOf('{}'));
      },
      [],
      ['Tecnologia', 'Marketing'],
    );

    await service.extract('company-1', { text: 'notebooks para o time de TI' });

    expect(sent).toContain('Tecnologia, Marketing');
  });

  it('devolve o Centro de Custo que a leitura identificou', async () => {
    const service = build(
      () =>
        Promise.resolve(
          completionOf('{"title":"Notebooks","costCenterName":"Tecnologia"}'),
        ),
      [],
      ['Tecnologia'],
    );

    const result = await service.extract('company-1', { text: 'notebooks' });

    expect(result.fields?.costCenterName).toBe('Tecnologia');
  });

  it('valor em dólar não vira reais escondido: fica null e avisa', async () => {
    const service = build(() =>
      Promise.resolve(
        completionOf(
          '{"title":"10 licenças","totalAmountCents":null,"foreignCurrencyNote":"US$ 20,00 por licença"}',
        ),
      ),
    );

    const result = await service.extract('company-1', {
      text: '10 licenças do Claude Code, US$ 20 cada',
    });

    expect(result.fields?.totalAmountCents).toBeNull();
    expect(result.fields?.foreignCurrencyNote).toBe('US$ 20,00 por licença');
  });

  it('divide entre Centros de Custo quando o texto descreve a proporção', async () => {
    const service = build(
      () =>
        Promise.resolve(
          completionOf(
            '{"title":"10 licenças","costCenterSplits":[{"costCenterName":"Tecnologia","percent":40},{"costCenterName":"Marketing","percent":60}]}',
          ),
        ),
      [],
      ['Tecnologia', 'Marketing'],
    );

    const result = await service.extract('company-1', {
      text: '10 licenças, 4 para tecnologia e 6 para marketing',
    });

    expect(result.fields?.costCenterSplits).toEqual([
      { costCenterName: 'Tecnologia', percent: 40 },
      { costCenterName: 'Marketing', percent: 60 },
    ]);
  });

  it('rateio com soma torta é corrigido, não descartado', async () => {
    const service = build(() =>
      Promise.resolve(
        completionOf(
          '{"costCenterSplits":[{"costCenterName":"Tecnologia","percent":33},{"costCenterName":"Marketing","percent":33},{"costCenterName":"Operações","percent":33}]}',
        ),
      ),
    );

    const result = await service.extract('company-1', { text: 'rateio' });
    const total = result.fields?.costCenterSplits?.reduce(
      (sum, split) => sum + split.percent,
      0,
    );

    expect(total).toBe(100);
  });

  it('rateio com soma implausível (metade do valor) é ignorado', async () => {
    const service = build(() =>
      Promise.resolve(
        completionOf(
          '{"costCenterSplits":[{"costCenterName":"Tecnologia","percent":20},{"costCenterName":"Marketing","percent":30}]}',
        ),
      ),
    );

    const result = await service.extract('company-1', { text: 'rateio' });

    expect(result.fields?.costCenterSplits).toBeNull();
  });

  it('um só Centro de Custo não é rateio', async () => {
    const service = build(() =>
      Promise.resolve(
        completionOf(
          '{"costCenterSplits":[{"costCenterName":"Tecnologia","percent":100}]}',
        ),
      ),
    );

    const result = await service.extract('company-1', { text: 'rateio' });

    expect(result.fields?.costCenterSplits).toBeNull();
  });

  it('sem conseguir identificar a área, devolve null em vez de chutar', async () => {
    const service = build(
      () => Promise.resolve(completionOf('{"title":"Notebooks"}')),
      [],
      ['Tecnologia', 'Marketing'],
    );

    const result = await service.extract('company-1', { text: 'notebooks' });

    expect(result.fields?.costCenterName).toBeNull();
  });
});
