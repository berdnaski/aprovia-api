export interface LlmMessage {
  role: 'system' | 'user';
  content: string;
}

export interface LlmCompletionInput {
  messages: LlmMessage[];
  timeoutMs?: number;
  maxTokens?: number;
  jsonMode?: boolean;
}

export interface LlmCompletionResult {
  content: string;
  promptTokens: number;
  completionTokens: number;
}

export class LlmUnavailableError extends Error {
  constructor(reason: string) {
    super(`Provedor de IA indisponível: ${reason}`);
    this.name = 'LlmUnavailableError';
  }
}

export abstract class ILlmClient {
  abstract complete(input: LlmCompletionInput): Promise<LlmCompletionResult>;
}
