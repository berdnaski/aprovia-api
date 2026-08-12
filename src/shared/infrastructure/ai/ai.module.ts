import { Global, Module } from '@nestjs/common';
import { ILlmClient } from 'src/shared/domain/llm.client';
import { DeepSeekLlmClient } from './deepseek-llm.client';

@Global()
@Module({
  providers: [{ provide: ILlmClient, useClass: DeepSeekLlmClient }],
  exports: [ILlmClient],
})
export class AiModule {}
