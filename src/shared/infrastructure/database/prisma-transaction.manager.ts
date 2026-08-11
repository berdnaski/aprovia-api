import { Injectable } from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import {
  ITransactionManager,
  TransactionContext,
  TransactionProvider,
} from 'src/shared/domain/transaction.manager';
import { PrismaService } from './prisma.service';

export class PrismaTransactionContext extends TransactionContext {
  readonly provider = TransactionProvider.PRISMA;

  constructor(readonly client: Prisma.TransactionClient) {
    super();
  }
}

@Injectable()
export class PrismaTransactionManager implements ITransactionManager {
  constructor(private readonly prisma: PrismaService) {}

  run<T>(work: (context: TransactionContext) => Promise<T>): Promise<T> {
    return this.prisma.$transaction((client) =>
      work(new PrismaTransactionContext(client)),
    );
  }
}

export function prismaClient(
  prisma: PrismaService,
  context?: TransactionContext,
): Prisma.TransactionClient {
  return context instanceof PrismaTransactionContext ? context.client : prisma;
}
