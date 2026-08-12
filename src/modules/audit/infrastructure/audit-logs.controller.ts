import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CompanyMemberRole } from 'generated/prisma/enums';
import { CurrentCompany } from 'src/shared/decorators/current-company.decorator';
import { Roles } from 'src/shared/decorators/roles.decorator';
import { PaginatedResponseDto } from 'src/shared/dto/paginated-response.dto';
import { ListAuditLogsUseCase } from '../application/list-audit-logs.use-case';
import { AuditLogResponseDto } from '../dto/audit-log-response.dto';
import { ListAuditLogsQueryDto } from '../dto/list-audit-logs-query.dto';

@ApiTags('Auditoria')
@ApiCookieAuth('access_token')
@Controller('audit-logs')
export class AuditLogsController {
  constructor(private readonly listAuditLogsUseCase: ListAuditLogsUseCase) {}

  @Get()
  @Roles(CompanyMemberRole.FINANCE_ADMIN)
  @ApiOperation({
    summary: 'Consultar a trilha de auditoria (RF80)',
    description:
      'Filtra por autor, tipo de evento, entidade e período. A trilha é append-only: não existe rota de alteração nem de remoção, para nenhum perfil (RN45).',
  })
  @ApiResponse({ status: 200, type: PaginatedResponseDto })
  async list(
    @CurrentCompany() companyId: string,
    @Query() query: ListAuditLogsQueryDto,
  ): Promise<PaginatedResponseDto<AuditLogResponseDto>> {
    const page = await this.listAuditLogsUseCase.execute(companyId, query);
    return PaginatedResponseDto.from(page, AuditLogResponseDto.fromEntity);
  }
}
