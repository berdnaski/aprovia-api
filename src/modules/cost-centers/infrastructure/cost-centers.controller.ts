import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseBoolPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CompanyMemberRole } from 'generated/prisma/enums';
import { CurrentCompany } from 'src/shared/decorators/current-company.decorator';
import { Roles } from 'src/shared/decorators/roles.decorator';
import { CreateCostCenterUseCase } from '../application/create-cost-center.use-case';
import { DeleteCostCenterUseCase } from '../application/delete-cost-center.use-case';
import { DisableCostCenterUseCase } from '../application/disable-cost-center.use-case';
import { FindCostCenterByIdUseCase } from '../application/find-cost-center-by-id.use-case';
import { LinkCostCenterMemberUseCase } from '../application/link-cost-center-member.use-case';
import { ListCostCenterMembersUseCase } from '../application/list-cost-center-members.use-case';
import { ListCostCentersUseCase } from '../application/list-cost-centers.use-case';
import { TransferCostCenterManagementUseCase } from '../application/transfer-cost-center-management.use-case';
import { UnlinkCostCenterMemberUseCase } from '../application/unlink-cost-center-member.use-case';
import { UpdateCostCenterUseCase } from '../application/update-cost-center.use-case';
import { TransferCostCenterManagementDto } from '../dto/transfer-cost-center-management.dto';
import { CostCenterMemberResponseDto } from '../dto/cost-center-member-response.dto';
import { CostCenterResponseDto } from '../dto/cost-center-response.dto';
import { CreateCostCenterDto } from '../dto/create-cost-center.dto';
import { LinkCostCenterMemberDto } from '../dto/link-cost-center-member.dto';
import { UpdateCostCenterDto } from '../dto/update-cost-center.dto';

@ApiTags('Centros de Custo')
@ApiCookieAuth('access_token')
@Controller('cost-centers')
export class CostCentersController {
  constructor(
    private readonly createCostCenterUseCase: CreateCostCenterUseCase,
    private readonly listCostCentersUseCase: ListCostCentersUseCase,
    private readonly findCostCenterByIdUseCase: FindCostCenterByIdUseCase,
    private readonly updateCostCenterUseCase: UpdateCostCenterUseCase,
    private readonly disableCostCenterUseCase: DisableCostCenterUseCase,
    private readonly deleteCostCenterUseCase: DeleteCostCenterUseCase,
    private readonly listCostCenterMembersUseCase: ListCostCenterMembersUseCase,
    private readonly linkCostCenterMemberUseCase: LinkCostCenterMemberUseCase,
    private readonly unlinkCostCenterMemberUseCase: UnlinkCostCenterMemberUseCase,
    private readonly transferCostCenterManagementUseCase: TransferCostCenterManagementUseCase,
  ) {}

  @Post()
  @Roles(CompanyMemberRole.FINANCE_ADMIN)
  @ApiOperation({
    summary: 'Criar Centro de Custo',
    description:
      'O gestor precisa ser membro ativo com perfil de Aprovador ou Admin Financeiro (RN14).',
  })
  @ApiResponse({ status: 201, type: CostCenterResponseDto })
  @ApiResponse({ status: 400, description: 'Gestor ou pai inválido' })
  @ApiResponse({ status: 409, description: 'Nome ou código já usado' })
  async create(
    @CurrentCompany() companyId: string,
    @Body() dto: CreateCostCenterDto,
  ): Promise<CostCenterResponseDto> {
    const costCenter = await this.createCostCenterUseCase.execute(
      companyId,
      dto,
    );
    return CostCenterResponseDto.fromEntity(costCenter);
  }

  @Get()
  @Roles(CompanyMemberRole.APPROVER, CompanyMemberRole.FINANCE_ADMIN)
  @ApiOperation({ summary: 'Listar Centros de Custo' })
  @ApiQuery({ name: 'includeDisabled', required: false, type: Boolean })
  @ApiResponse({ status: 200, type: [CostCenterResponseDto] })
  async list(
    @CurrentCompany() companyId: string,
    @Query('includeDisabled', new ParseBoolPipe({ optional: true }))
    includeDisabled?: boolean,
  ): Promise<CostCenterResponseDto[]> {
    const costCenters = await this.listCostCentersUseCase.execute(companyId, {
      includeDisabled,
    });
    return CostCenterResponseDto.fromEntities(costCenters);
  }

  @Post('transfer-management')
  @Roles(CompanyMemberRole.FINANCE_ADMIN)
  @ApiOperation({
    summary: 'Transferir a gestão dos Centros de Custo de um membro',
    description:
      'Transferência prévia exigida pelo RF25: libera a inativação de um membro que é gestor de Centro de Custo. Move todos os Centros de Custo ativos de uma vez.',
  })
  @ApiResponse({ status: 201, type: [CostCenterResponseDto] })
  @ApiResponse({
    status: 400,
    description: 'Destino inválido ou nada a transferir',
  })
  async transferManagement(
    @CurrentCompany() companyId: string,
    @Body() dto: TransferCostCenterManagementDto,
  ): Promise<CostCenterResponseDto[]> {
    const costCenters = await this.transferCostCenterManagementUseCase.execute(
      companyId,
      dto.fromMemberId,
      dto.toMemberId,
    );
    return CostCenterResponseDto.fromEntities(costCenters);
  }

  @Get(':id')
  @Roles(CompanyMemberRole.APPROVER, CompanyMemberRole.FINANCE_ADMIN)
  @ApiOperation({ summary: 'Buscar Centro de Custo por ID' })
  @ApiResponse({ status: 200, type: CostCenterResponseDto })
  @ApiResponse({ status: 404, description: 'Centro de Custo não encontrado' })
  async findById(
    @CurrentCompany() companyId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CostCenterResponseDto> {
    const costCenter = await this.findCostCenterByIdUseCase.execute(
      id,
      companyId,
    );
    return CostCenterResponseDto.fromEntity(costCenter);
  }

  @Patch(':id')
  @Roles(CompanyMemberRole.FINANCE_ADMIN)
  @ApiOperation({
    summary: 'Editar Centro de Custo',
    description:
      'Permite alterar nome, código, gestor e posição na hierarquia. Ciclos entre pai e filho são rejeitados (RF27).',
  })
  @ApiResponse({ status: 200, type: CostCenterResponseDto })
  @ApiResponse({
    status: 400,
    description: 'Ciclo na hierarquia ou gestor inválido',
  })
  async update(
    @CurrentCompany() companyId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCostCenterDto,
  ): Promise<CostCenterResponseDto> {
    const costCenter = await this.updateCostCenterUseCase.execute(
      id,
      companyId,
      dto,
    );
    return CostCenterResponseDto.fromEntity(costCenter);
  }

  @Patch(':id/disable')
  @Roles(CompanyMemberRole.FINANCE_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Inativar Centro de Custo',
    description:
      'Impede novos pedidos e preserva os existentes até a conclusão (RN15). Filhos ativos precisam ser tratados antes.',
  })
  @ApiResponse({ status: 204, description: 'Centro de Custo inativado' })
  @ApiResponse({
    status: 409,
    description: 'Já inativo ou possui filhos ativos',
  })
  async disable(
    @CurrentCompany() companyId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.disableCostCenterUseCase.execute(id, companyId);
  }

  @Delete(':id')
  @Roles(CompanyMemberRole.FINANCE_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Excluir Centro de Custo',
    description:
      'Só permitido enquanto o Centro de Custo não tiver histórico. Com pedidos, orçamento, filhos, membros vinculados ou regras de alçada, use a inativação (RN15).',
  })
  @ApiResponse({ status: 204, description: 'Centro de Custo excluído' })
  @ApiResponse({
    status: 409,
    description: 'Centro de Custo já possui histórico',
  })
  async delete(
    @CurrentCompany() companyId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.deleteCostCenterUseCase.execute(id, companyId);
  }

  @Get(':id/members')
  @Roles(CompanyMemberRole.APPROVER, CompanyMemberRole.FINANCE_ADMIN)
  @ApiOperation({ summary: 'Listar membros vinculados ao Centro de Custo' })
  @ApiResponse({ status: 200, type: [CostCenterMemberResponseDto] })
  async listMembers(
    @CurrentCompany() companyId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CostCenterMemberResponseDto[]> {
    const links = await this.listCostCenterMembersUseCase.execute(
      id,
      companyId,
    );
    return CostCenterMemberResponseDto.fromEntities(links);
  }

  @Post(':id/members')
  @Roles(CompanyMemberRole.FINANCE_ADMIN)
  @ApiOperation({ summary: 'Vincular membro ao Centro de Custo' })
  @ApiResponse({ status: 201, type: CostCenterMemberResponseDto })
  @ApiResponse({ status: 409, description: 'Membro já vinculado' })
  async linkMember(
    @CurrentCompany() companyId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: LinkCostCenterMemberDto,
  ): Promise<CostCenterMemberResponseDto> {
    const link = await this.linkCostCenterMemberUseCase.execute(
      id,
      companyId,
      dto.memberId,
    );
    return CostCenterMemberResponseDto.fromEntity(link);
  }

  @Delete(':id/members/:memberId')
  @Roles(CompanyMemberRole.FINANCE_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Desvincular membro do Centro de Custo' })
  @ApiResponse({ status: 204, description: 'Membro desvinculado' })
  @ApiResponse({ status: 409, description: 'Membro não vinculado' })
  async unlinkMember(
    @CurrentCompany() companyId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
  ): Promise<void> {
    await this.unlinkCostCenterMemberUseCase.execute(id, companyId, memberId);
  }
}
