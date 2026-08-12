import { Global, Module } from '@nestjs/common';
import { IAuditLogRepository } from '../domain/audit-logs.repository.interface';
import { AuditLogRepository } from './audit-logs.repository';
import { AuditLogsController } from './audit-logs.controller';
import { ListAuditLogsUseCase } from '../application/list-audit-logs.use-case';

@Global()
@Module({
  controllers: [AuditLogsController],
  providers: [
    { provide: IAuditLogRepository, useClass: AuditLogRepository },
    ListAuditLogsUseCase,
  ],
  exports: [IAuditLogRepository],
})
export class AuditModule {}
