import { Controller, Get, Query, Res } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiProduces,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Response } from 'express';
import { CompanyMemberRole } from 'generated/prisma/enums';
import { RequestActor } from 'src/modules/purchase-requests/application/find-request-by-id.use-case';
import {
  ALL_ROLES,
  CurrentActor,
} from 'src/modules/purchase-requests/infrastructure/request-actor';
import { CurrentCompany } from 'src/shared/decorators/current-company.decorator';
import { Roles } from 'src/shared/decorators/roles.decorator';
import { ExportRequestsUseCase } from '../application/export-requests.use-case';
import { GetDashboardUseCase } from '../application/get-dashboard.use-case';
import { GetDreUseCase } from '../application/get-dre.use-case';
import { DashboardQueryDto } from '../dto/dashboard-query.dto';
import { DashboardResponseDto } from '../dto/dashboard-response.dto';
import { DreQueryDto } from '../dto/dre-query.dto';
import { DreResponseDto } from '../dto/dre-response.dto';
import { ExportRequestsQueryDto } from '../dto/export-requests-query.dto';

@ApiTags('Métricas e exportação')
@ApiCookieAuth('access_token')
@Controller('analytics')
export class AnalyticsController {
  constructor(
    private readonly getDashboardUseCase: GetDashboardUseCase,
    private readonly exportRequestsUseCase: ExportRequestsUseCase,
    private readonly getDreUseCase: GetDreUseCase,
  ) {}

  @Get('dashboard')
  @Roles(CompanyMemberRole.FINANCE_ADMIN)
  @ApiOperation({
    summary: 'Painel consolidado (RF75, RF76)',
    description:
      'Totais por status, consumo por Centro de Custo, gargalos do fluxo, pedidos repetidos e tempo médio de aprovação por aprovador e por Centro de Custo.',
  })
  @ApiResponse({ status: 200, type: DashboardResponseDto })
  async dashboard(
    @CurrentCompany() companyId: string,
    @Query() query: DashboardQueryDto,
  ): Promise<DashboardResponseDto> {
    const metrics = await this.getDashboardUseCase.execute(companyId, query);

    return DashboardResponseDto.fromDomain(metrics);
  }

  @Get('dre')
  @Roles(CompanyMemberRole.FINANCE_ADMIN, CompanyMemberRole.ACCOUNTANT)
  @ApiOperation({
    summary: 'DRE gerencial (receita, custo e despesa realizados)',
    description:
      'Soma o que foi efetivamente pago (payables com status PAID), agrupado por conta contábil e por natureza (receita, custo, despesa), no período. Como este é um sistema de compras, a receita normalmente é zero — o valor útil aqui é custo + despesa e a quebra por conta.',
  })
  @ApiResponse({ status: 200, type: DreResponseDto })
  async dre(
    @CurrentCompany() companyId: string,
    @Query() query: DreQueryDto,
  ): Promise<DreResponseDto> {
    const report = await this.getDreUseCase.execute(companyId, query);

    return DreResponseDto.fromDomain(report);
  }

  @Get('exports/requests')
  @Roles(...ALL_ROLES)
  @ApiProduces('text/csv')
  @ApiOperation({
    summary: 'Exportar requisições para conciliação (RF78)',
    description:
      'Respeita a visibilidade do perfil (RN43): cada um exporta apenas o que enxerga na plataforma.',
  })
  @ApiResponse({ status: 200, description: 'Arquivo CSV ou XLSX' })
  @ApiResponse({ status: 400, description: 'Filtro devolve linhas demais' })
  async exportRequests(
    @CurrentActor() actor: RequestActor,
    @Query() query: ExportRequestsQueryDto,
    @Res() response: Response,
  ): Promise<void> {
    const file = await this.exportRequestsUseCase.execute(actor, query);

    response.setHeader('Content-Type', file.contentType);
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${file.filename}"`,
    );
    response.setHeader('Content-Length', file.content.length);
    response.end(file.content);
  }
}
