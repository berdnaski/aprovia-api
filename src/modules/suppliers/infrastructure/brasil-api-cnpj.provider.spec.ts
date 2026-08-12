import { ConfigService } from '@nestjs/config';
import { RegistrationStatus } from 'generated/prisma/enums';
import { EnvSchema } from 'src/shared/config/env.schema';
import { CnpjLookupFailure } from '../domain/cnpj-lookup.provider';
import { BrasilApiCnpjProvider } from './brasil-api-cnpj.provider';

const configService = {
  get: (key: keyof EnvSchema) =>
    key === 'BRASIL_API_BASE_URL'
      ? 'https://brasilapi.com.br/api'
      : (3000 as never),
} as unknown as ConfigService<EnvSchema, true>;

const provider = new BrasilApiCnpjProvider(configService);

const mockFetch = (impl: () => Promise<Response>) => {
  global.fetch = jest.fn(impl);
};

const jsonResponse = (body: unknown, status = 200): Response =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  }) as Response;

describe('BrasilApiCnpjProvider', () => {
  afterEach(() => jest.restoreAllMocks());

  it('mapeia ATIVA para ACTIVE e monta o endereço', async () => {
    mockFetch(() =>
      Promise.resolve(
        jsonResponse({
          razao_social: 'Acme Indústria LTDA',
          nome_fantasia: 'Acme',
          descricao_situacao_cadastral: 'ATIVA',
          logradouro: 'Av. Paulista',
          numero: '1000',
          municipio: 'São Paulo',
          uf: 'SP',
          cep: '01310100',
        }),
      ),
    );

    const outcome = await provider.lookup('11.222.333/0001-81');

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;

    expect(outcome.data.registrationStatus).toBe(RegistrationStatus.ACTIVE);
    expect(outcome.data.legalName).toBe('Acme Indústria LTDA');
    expect(outcome.data.address.street).toBe('Av. Paulista, 1000');
    expect(outcome.data.cnpj).toBe('11222333000181');
  });

  it.each([
    ['BAIXADA', RegistrationStatus.CLOSED],
    ['INAPTA', RegistrationStatus.INACTIVE],
    ['SUSPENSA', RegistrationStatus.SUSPENDED],
    ['NULA', RegistrationStatus.VOID],
  ])('mapeia %s para %s', async (description, expected) => {
    mockFetch(() =>
      Promise.resolve(
        jsonResponse({
          razao_social: 'Acme',
          descricao_situacao_cadastral: description,
        }),
      ),
    );

    const outcome = await provider.lookup('11222333000181');

    expect(outcome.ok && outcome.data.registrationStatus).toBe(expected);
  });

  it('situação desconhecida vira UNKNOWN em vez de quebrar', async () => {
    mockFetch(() =>
      Promise.resolve(
        jsonResponse({
          razao_social: 'Acme',
          descricao_situacao_cadastral: 'ALGO NOVO',
        }),
      ),
    );

    const outcome = await provider.lookup('11222333000181');

    expect(outcome.ok && outcome.data.registrationStatus).toBe(
      RegistrationStatus.UNKNOWN,
    );
  });

  it('situação vazia vira UNKNOWN', async () => {
    mockFetch(() =>
      Promise.resolve(
        jsonResponse({
          razao_social: 'Acme',
          descricao_situacao_cadastral: '',
        }),
      ),
    );

    const outcome = await provider.lookup('11222333000181');

    expect(outcome.ok && outcome.data.registrationStatus).toBe(
      RegistrationStatus.UNKNOWN,
    );
  });

  it('timeout devolve TIMEOUT sem lançar (RNF14)', async () => {
    mockFetch(() => {
      const error = new Error('The operation was aborted');
      error.name = 'TimeoutError';
      return Promise.reject(error);
    });

    const outcome = await provider.lookup('11222333000181');

    expect(outcome.ok).toBe(false);
    expect(!outcome.ok && outcome.failure).toBe(CnpjLookupFailure.TIMEOUT);
  });

  it('rede fora devolve UNAVAILABLE sem lançar', async () => {
    mockFetch(() => Promise.reject(new Error('ECONNREFUSED')));

    const outcome = await provider.lookup('11222333000181');

    expect(!outcome.ok && outcome.failure).toBe(CnpjLookupFailure.UNAVAILABLE);
  });

  it('404 devolve NOT_FOUND', async () => {
    mockFetch(() => Promise.resolve(jsonResponse({}, 404)));

    const outcome = await provider.lookup('11222333000181');

    expect(!outcome.ok && outcome.failure).toBe(CnpjLookupFailure.NOT_FOUND);
  });

  it('500 devolve UNAVAILABLE', async () => {
    mockFetch(() => Promise.resolve(jsonResponse({}, 500)));

    const outcome = await provider.lookup('11222333000181');

    expect(!outcome.ok && outcome.failure).toBe(CnpjLookupFailure.UNAVAILABLE);
  });

  it('JSON inválido devolve MALFORMED', async () => {
    mockFetch(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.reject(new Error('Unexpected token')),
      } as Response),
    );

    const outcome = await provider.lookup('11222333000181');

    expect(!outcome.ok && outcome.failure).toBe(CnpjLookupFailure.MALFORMED);
  });

  it('resposta sem razão social devolve MALFORMED', async () => {
    mockFetch(() =>
      Promise.resolve(jsonResponse({ descricao_situacao_cadastral: 'ATIVA' })),
    );

    const outcome = await provider.lookup('11222333000181');

    expect(!outcome.ok && outcome.failure).toBe(CnpjLookupFailure.MALFORMED);
  });
});
