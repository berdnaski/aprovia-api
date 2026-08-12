import { BullModule } from '@nestjs/bullmq';
import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EnvSchema } from 'src/shared/config/env.schema';
import { DeadLetterService } from './dead-letter.service';
import { QueueName } from './queue-name';

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService<EnvSchema, true>) => ({
        connection: {
          host: configService.get('REDIS_HOST', { infer: true }),
          port: configService.get('REDIS_PORT', { infer: true }),
        },
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
          removeOnComplete: { age: 3600, count: 1000 },
          removeOnFail: { age: 86400 },
        },
      }),
    }),
    BullModule.registerQueue({ name: QueueName.AI_EXTRACTION }),
    BullModule.registerQueue({ name: QueueName.NOTIFICATIONS }),
    BullModule.registerQueue({
      name: QueueName.DEAD_LETTER,
      defaultJobOptions: { attempts: 1, removeOnComplete: false },
    }),
  ],
  providers: [DeadLetterService],
  exports: [BullModule, DeadLetterService],
})
export class QueueModule {}
