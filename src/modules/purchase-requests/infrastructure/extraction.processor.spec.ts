import { Job } from 'bullmq';
import { DeadLetterService } from 'src/shared/infrastructure/queue/dead-letter.service';
import { ExtractionJobData } from '../application/request-extraction.use-case';
import { IExtractionResultRepository } from '../domain/extraction-results.repository.interface';
import {
  ExtractionResult,
  ExtractionStatus,
  IExtractionService,
} from '../domain/extraction.service';
import { ExtractionProcessor } from './extraction.processor';

const jobOf = (attemptsMade: number) =>
  ({
    data: {
      companyId: 'company-1',
      requestId: 'request-1',
      extractionId: 'extraction-1',
      text: 'Solicito 10 acessos do Claude Code',
    },
    opts: { attempts: 3 },
    attemptsMade,
  }) as unknown as Job<ExtractionJobData>;

const unavailable: ExtractionResult = {
  status: ExtractionStatus.FAILED,
  fields: null,
  failureReason: 'Provedor de IA indisponível: timeout de 45000ms',
  extractedAt: null,
  retryable: true,
};

function build(result: ExtractionResult) {
  const extractionService = {
    extract: jest.fn().mockResolvedValue(result),
  } as unknown as IExtractionService;
  const complete = jest.fn().mockResolvedValue(undefined);
  const repository = { complete } as unknown as IExtractionResultRepository;

  return {
    processor: new ExtractionProcessor(
      extractionService,
      repository,
      {} as DeadLetterService,
    ),
    complete,
  };
}

describe('ExtractionProcessor', () => {
  it('provedor lento com tentativas sobrando volta para a fila sem gravar falha', async () => {
    const { processor, complete } = build(unavailable);

    await expect(processor.process(jobOf(0))).rejects.toThrow('timeout');
    expect(complete).not.toHaveBeenCalled();
  });

  it('na última tentativa grava a falha com mensagem para quem pediu', async () => {
    const { processor, complete } = build(unavailable);

    await processor.process(jobOf(2));

    expect(complete).toHaveBeenCalledWith('extraction-1', {
      status: ExtractionStatus.FAILED,
      fields: null,
      failureReason: expect.stringContaining('Tente de novo') as unknown,
    });
  });

  it('falha que não melhora tentando de novo é gravada na primeira vez', async () => {
    const { processor, complete } = build({
      ...unavailable,
      retryable: false,
      failureReason: 'Anexo não encontrado para extração',
    });

    await processor.process(jobOf(0));

    expect(complete).toHaveBeenCalledWith('extraction-1', {
      status: ExtractionStatus.FAILED,
      fields: null,
      failureReason: 'Anexo não encontrado para extração',
    });
  });
});
