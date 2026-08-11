import { Global, Module } from '@nestjs/common';
import { ITransactionManager } from 'src/shared/domain/transaction.manager';
import { PrismaTransactionManager } from './prisma-transaction.manager';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [
    PrismaService,
    { provide: ITransactionManager, useClass: PrismaTransactionManager },
  ],
  exports: [PrismaService, ITransactionManager],
})
export class DatabaseModule {}
