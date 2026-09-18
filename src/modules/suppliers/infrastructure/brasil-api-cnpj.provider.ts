import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RegistrationStatus } from 'generated/prisma/enums';
import { EnvSchema } from 'src/shared/config/env.schema';
import { normalizeCnpj } from 'src/shared/domain/cnpj';
import {
  CnpjLookupFailure,
  CnpjLookupOutcome,
  ICnpjLookupProvider,
} from '../domain/cnpj-lookup.provider';
import { SupplierPartner } from '../domain/supplier.entity';
import { resolveTaxRegime } from '../domain/services/tax-regime.service';

interface BrasilApiRegimeTributario {
  ano: number;
  forma_de_tributacao?: string | null;
}

interface BrasilApiSocio {
  nome_socio?: string;
  qualificacao_socio?: string;
  data_entrada_sociedade?: string;
}

interface BrasilApiCnpjResponse {
  cnpj?: string;
  razao_social?: string;
  nome_fantasia?: string;
  descricao_situacao_cadastral?: string;
  logradouro?: string;
  numero?: string;
  bairro?: string;
  municipio?: string;
  uf?: string;
  cep?: string;
  email?: string;
  ddd_telefone_1?: string;
  data_inicio_atividade?: string;
  natureza_juridica?: string;
  porte?: string;
  capital_social?: number;
  cnae_fiscal?: number;
  cnae_fiscal_descricao?: string;
  opcao_pelo_simples?: boolean;
  opcao_pelo_mei?: boolean;
  regime_tributario?: BrasilApiRegimeTributario[];
  qsa?: BrasilApiSocio[];
  inscricoes_estaduais?: { inscricao_estadual?: string; ativo?: boolean }[];
}

const STATUS_BY_DESCRIPTION: Record<string, RegistrationStatus> = {
  ATIVA: RegistrationStatus.ACTIVE,
  BAIXADA: RegistrationStatus.CLOSED,
  INAPTA: RegistrationStatus.INACTIVE,
  SUSPENSA: RegistrationStatus.SUSPENDED,
  NULA: RegistrationStatus.VOID,
};

function blankToNull(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function parseDate(value: string | undefined): Date | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parsePartners(qsa: BrasilApiSocio[] | undefined): SupplierPartner[] {
  return (qsa ?? [])
    .filter((partner) => partner.nome_socio)
    .map((partner) => ({
      name: partner.nome_socio as string,
      role: blankToNull(partner.qualificacao_socio) ?? 'Sócio',
      enteredAt: blankToNull(partner.data_entrada_sociedade),
    }));
}

@Injectable()
export class BrasilApiCnpjProvider implements ICnpjLookupProvider {
  private readonly logger = new Logger(BrasilApiCnpjProvider.name);

  constructor(private readonly configService: ConfigService<EnvSchema, true>) {}

  async lookup(cnpj: string): Promise<CnpjLookupOutcome> {
    const digits = normalizeCnpj(cnpj);
    const baseUrl = this.configService.get('BRASIL_API_BASE_URL', {
      infer: true,
    });
    const timeoutMs =
      this.configService.get('BRASIL_API_TIMEOUT_MS', { infer: true }) ?? 3000;

    let response: Response;

    try {
      response = await fetch(`${baseUrl}/cnpj/v1/${digits}`, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'AprovAI/1.0',
        },
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (error) {
      const isTimeout = error instanceof Error && error.name === 'TimeoutError';

      this.logger.warn(
        `Consulta de CNPJ ${digits} falhou: ${(error as Error).message}`,
      );

      return {
        ok: false,
        failure: isTimeout
          ? CnpjLookupFailure.TIMEOUT
          : CnpjLookupFailure.UNAVAILABLE,
        message: isTimeout
          ? `A consulta à Receita Federal excedeu ${timeoutMs}ms`
          : 'Serviço de consulta de CNPJ indisponível',
      };
    }

    if (response.status === 404) {
      return {
        ok: false,
        failure: CnpjLookupFailure.NOT_FOUND,
        message: 'CNPJ não encontrado na base da Receita Federal',
      };
    }

    if (!response.ok) {
      return {
        ok: false,
        failure: CnpjLookupFailure.UNAVAILABLE,
        message: `Serviço de consulta respondeu HTTP ${response.status}`,
      };
    }

    let payload: BrasilApiCnpjResponse;

    try {
      payload = (await response.json()) as BrasilApiCnpjResponse;
    } catch {
      return {
        ok: false,
        failure: CnpjLookupFailure.MALFORMED,
        message: 'Resposta da consulta de CNPJ não é JSON válido',
      };
    }

    const legalName = blankToNull(payload.razao_social);

    if (!legalName) {
      return {
        ok: false,
        failure: CnpjLookupFailure.MALFORMED,
        message: 'Resposta da consulta de CNPJ veio sem razão social',
      };
    }

    const description = payload.descricao_situacao_cadastral
      ?.trim()
      .toUpperCase();

    const street = [
      blankToNull(payload.logradouro),
      blankToNull(payload.numero),
    ]
      .filter(Boolean)
      .join(', ');

    const activeState = payload.inscricoes_estaduais?.find(
      (item) => item.ativo,
    );

    return {
      ok: true,
      data: {
        cnpj: digits,
        legalName,
        tradeName: blankToNull(payload.nome_fantasia),
        registrationStatus: description
          ? (STATUS_BY_DESCRIPTION[description] ?? RegistrationStatus.UNKNOWN)
          : RegistrationStatus.UNKNOWN,
        address: {
          street: street || null,
          city: blankToNull(payload.municipio),
          state: blankToNull(payload.uf),
          zipCode: blankToNull(payload.cep),
        },
        email: blankToNull(payload.email),
        phone: blankToNull(payload.ddd_telefone_1),
        fiscal: {
          openedOn: parseDate(payload.data_inicio_atividade),
          legalNature: blankToNull(payload.natureza_juridica),
          companySize: blankToNull(payload.porte),
          shareCapitalCents:
            typeof payload.capital_social === 'number'
              ? BigInt(Math.round(payload.capital_social * 100))
              : null,
          mainActivityCode: payload.cnae_fiscal
            ? String(payload.cnae_fiscal)
            : null,
          mainActivityDescription: blankToNull(payload.cnae_fiscal_descricao),
          simplesOpted: payload.opcao_pelo_simples ?? null,
          meiOpted: payload.opcao_pelo_mei ?? null,
          taxRegime: resolveTaxRegime({
            simplesOpted: payload.opcao_pelo_simples ?? null,
            meiOpted: payload.opcao_pelo_mei ?? null,
            regimeTributario: payload.regime_tributario ?? [],
          }),
          partners: parsePartners(payload.qsa),
        },
        stateRegistration: activeState?.inscricao_estadual ?? null,
      },
    };
  }
}
