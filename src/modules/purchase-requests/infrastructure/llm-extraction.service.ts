import { Injectable, Logger } from '@nestjs/common';
import { PDFParse } from 'pdf-parse';
import { ICategoryRepository } from 'src/modules/categories/domain/categories.repository.interface';
import { ICostCenterRepository } from 'src/modules/cost-centers/domain/cost-centers.repository.interface';
import { ILlmClient, LlmUnavailableError } from 'src/shared/domain/llm.client';
import { IStorageService } from 'src/shared/domain/storage.service';
import {
  EMPTY_EXTRACTION,
  ExtractedCostCenterSplit,
  ExtractedFields,
  ExtractedItem,
  ExtractionResult,
  ExtractionSource,
  ExtractionStatus,
  IExtractionService,
} from '../domain/extraction.service';
import { IRequestFileRepository } from '../domain/request-files.repository.interface';

function buildSystemPrompt(
  categoryNames: string[],
  costCenterNames: string[],
): string {
  const categoryRule =
    categoryNames.length > 0
      ? `- categoryName: deduza pelo que está sendo comprado e escolha a mais adequada entre estas categorias da empresa: ${categoryNames.join(', ')}. Use exatamente o nome da lista. null se nenhuma servir.`
      : '- categoryName: a categoria de compra. null se não der para deduzir.';

  const costCenterRule =
    costCenterNames.length > 0
      ? `- costCenterName: a área que vai arcar com a despesa, escolhida entre estes Centros de Custo: ${costCenterNames.join(', ')}. Use exatamente o nome da lista. Deduza pelo destino da compra, como o time citado ou o tipo de gasto. null quando o texto não permitir concluir com segurança.`
      : '- costCenterName: null.';

  return `Você extrai dados de pedidos de compra brasileiros.
O texto pode ser um orçamento completo, um e-mail do fornecedor ou só uma frase curta de quem precisa comprar algo, como "preciso de 5 licenças do Figma para o time de design".
Responda APENAS com JSON no formato:
{"title":string|null,"description":string|null,"supplierCnpj":string|null,"supplierName":string|null,"totalAmountCents":string|null,"categoryName":string|null,"costCenterName":string|null,"costCenterSplits":[{"costCenterName":string,"percent":number}]|null,"paymentTerms":string|null,"foreignCurrencyNote":string|null,"items":[{"description":string,"quantity":string|null,"unit":string|null,"unitPriceCents":string|null}]}
Regras:
- Preencha tudo o que o texto permite concluir com segurança, mesmo quando ele é curto ou incompleto. O que não der para saber fica null.
- title: resumo curto do que está sendo comprado, até 80 caracteres, sem a palavra "solicitação". Ex: "5 licenças do Figma".
- description: 1 ou 2 frases para quem vai aprovar: o que é, para quem ou para que serve e o que justifica a compra. Use só o que o texto diz, com as suas palavras.
${categoryRule}
${costCenterRule}
- costCenterSplits: preencha SÓ quando o texto dividir a compra entre 2 ou mais Centros de Custo da lista acima (ex: "4 para o time de tecnologia e 6 para marketing"). Cada item tem costCenterName (nome exato da lista) e percent (0 a 100, calculado pela proporção descrita — quantidade, valor ou fração). A soma dos percent tem que fechar em 100. Se o texto citar só um Centro de Custo, ou a divisão não vier clara, deixe null e use costCenterName normalmente.
- supplierName: a empresa que vende, quando o texto disser. O nome de um produto ou marca sozinho não é fornecedor. null se nenhum fornecedor for citado.
- supplierCnpj: apenas os 14 dígitos, sem máscara. null se não houver.
- totalAmountCents e unitPriceCents: SÓ preencha quando o valor estiver em reais (R$). R$ 1.234,56 vira "123456". Se o documento trouxer o valor em outra moeda (US$, USD, EUR, €, etc), NUNCA converta o número como se fosse reais: deixe totalAmountCents e unitPriceCents null e descreva o valor original em foreignCurrencyNote.
- foreignCurrencyNote: preencha só quando o documento trouxer valores em moeda que não seja real, com o texto exato do valor e da moeda encontrados (ex: "US$ 20,00 por licença"). O sistema só opera em reais, então esse valor precisa ser convertido por uma pessoa. null quando tudo já está em reais ou não há valor.
- paymentTerms: a condição de pagamento, como "30 dias" ou "boleto à vista". null se não houver.
- items: cada produto ou serviço pedido, mesmo sem preço. quantity como string de dígitos ("1" se o texto não disser). unit curta, como "un", "licença", "mês" ou "hora". unitPriceCents em centavos só quando o texto trouxer o preço de cada um, senão null. Use [] se não der para identificar o que está sendo pedido.
- Nunca invente preço, CNPJ, fornecedor ou condição de pagamento que não estejam no texto.`;
}

const MAX_TEXT_LENGTH = 20000;

async function readPdfText(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: buffer });

  try {
    const { text } = await parser.getText();
    return text;
  } finally {
    await parser.destroy();
  }
}

function asNullableString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}

const MAX_ITEMS = 30;
const MAX_SPLITS = 10;
const SPLIT_SUM_TOLERANCE = 2;

function digitsOrNull(value: unknown): string | null {
  const digits = asNullableString(value)?.replace(/\D/g, '');
  return digits && digits !== '' ? digits : null;
}

function parseCostCenterSplits(
  value: unknown,
): ExtractedCostCenterSplit[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const splits = value
    .slice(0, MAX_SPLITS)
    .map((raw): ExtractedCostCenterSplit | null => {
      if (typeof raw !== 'object' || raw === null) {
        return null;
      }

      const row = raw as Record<string, unknown>;
      const costCenterName = asNullableString(row.costCenterName);
      const percent = Number(row.percent);

      if (!costCenterName || !Number.isFinite(percent) || percent <= 0) {
        return null;
      }

      return { costCenterName, percent };
    })
    .filter((split): split is ExtractedCostCenterSplit => split !== null);

  if (splits.length < 2) {
    return null;
  }

  const total = splits.reduce((sum, split) => sum + split.percent, 0);

  if (Math.abs(total - 100) > SPLIT_SUM_TOLERANCE) {
    return null;
  }

  // Fecha em exatos 100: distribui o arredondamento na maior fatia, que é
  // onde 1 ponto percentual a mais ou a menos passa mais despercebido.
  const normalized = splits.map((split) => ({
    ...split,
    percent: (split.percent / total) * 100,
  }));

  const biggest = normalized.reduce((max, split) =>
    split.percent > max.percent ? split : max,
  );
  const rounded = normalized.map((split) => ({
    ...split,
    percent: Math.round(split.percent * 100) / 100,
  }));
  const roundedTotal = rounded.reduce((sum, split) => sum + split.percent, 0);
  const gap = Math.round((100 - roundedTotal) * 100) / 100;

  if (gap !== 0) {
    const target = rounded.find(
      (split) => split.costCenterName === biggest.costCenterName,
    );

    if (target) {
      target.percent = Math.round((target.percent + gap) * 100) / 100;
    }
  }

  return rounded;
}

function parseItems(value: unknown): ExtractedItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .slice(0, MAX_ITEMS)
    .map((raw): ExtractedItem | null => {
      if (typeof raw !== 'object' || raw === null) {
        return null;
      }

      const row = raw as Record<string, unknown>;
      const description = asNullableString(row.description);

      if (!description) {
        return null;
      }

      const quantity = digitsOrNull(row.quantity);
      const unitPriceCents = digitsOrNull(row.unitPriceCents);

      return {
        description: description.slice(0, 200),
        quantity: quantity && quantity !== '0' ? quantity : '1',
        unit: asNullableString(row.unit)?.slice(0, 20) ?? 'un',
        unitPriceCents:
          unitPriceCents && unitPriceCents !== '0' ? unitPriceCents : null,
      };
    })
    .filter((item): item is ExtractedItem => item !== null);
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
    title: asNullableString(payload.title)?.slice(0, 200) ?? null,
    description: asNullableString(payload.description)?.slice(0, 2000) ?? null,
    supplierCnpj: cnpj && cnpj.length === 14 ? cnpj : null,
    supplierName: asNullableString(payload.supplierName),
    totalAmountCents: amount && amount !== '' ? amount : null,
    categoryName: asNullableString(payload.categoryName),
    costCenterName: asNullableString(payload.costCenterName),
    costCenterSplits: parseCostCenterSplits(payload.costCenterSplits),
    paymentTerms: asNullableString(payload.paymentTerms),
    foreignCurrencyNote:
      asNullableString(payload.foreignCurrencyNote)?.slice(0, 200) ?? null,
    items: parseItems(payload.items),
  };
}

@Injectable()
export class LlmExtractionService implements IExtractionService {
  private readonly logger = new Logger(LlmExtractionService.name);

  constructor(
    private readonly llmClient: ILlmClient,
    private readonly storageService: IStorageService,
    private readonly requestFileRepository: IRequestFileRepository,
    private readonly categoryRepository: ICategoryRepository,
    private readonly costCenterRepository: ICostCenterRepository,
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

      if (file.mimeType.startsWith('image/')) {
        return this.failed(
          'Imagens ainda não são lidas automaticamente. Cole o texto do documento para a leitura assistida',
        );
      }

      try {
        const buffer = await this.storageService.getObject(file.storageKey);

        const content =
          file.mimeType === 'application/pdf'
            ? await readPdfText(buffer)
            : buffer.toString('utf8');

        text = content.slice(0, MAX_TEXT_LENGTH);
      } catch (error) {
        return this.failed(
          `Não foi possível ler o anexo: ${(error as Error).message}`,
        );
      }

      if (text.trim() === '') {
        return this.failed(
          'O anexo não tem texto selecionável. Se for um documento digitalizado, cole o texto para a leitura assistida',
        );
      }
    }

    if (text.trim() === '') {
      return this.failed('Nada para extrair: documento vazio ou ilegível');
    }

    const categories = await this.categoryRepository.list(companyId);
    const categoryNames = categories.map((category) => category.name);

    const costCenters = await this.costCenterRepository.list(companyId);
    const costCenterNames = costCenters.map((costCenter) => costCenter.name);

    try {
      const completion = await this.llmClient.complete({
        jsonMode: true,
        messages: [
          {
            role: 'system',
            content: buildSystemPrompt(categoryNames, costCenterNames),
          },
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
        return this.failed(error.message, true);
      }

      this.logger.error(`Falha inesperada na extração: ${String(error)}`);
      return this.failed('Falha inesperada na extração');
    }
  }

  private failed(reason: string, retryable = false): ExtractionResult {
    this.logger.warn(`Extração falhou: ${reason}`);

    return {
      status: ExtractionStatus.FAILED,
      fields: null,
      failureReason: reason,
      extractedAt: null,
      retryable,
    };
  }
}
