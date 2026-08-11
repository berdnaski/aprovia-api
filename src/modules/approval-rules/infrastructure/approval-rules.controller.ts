import { Body, Controller, Delete, Get, Put, Query } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CompanyMemberRole } from 'generated/prisma/enums';
import { CurrentCompany } from 'src/shared/decorators/current-company.decorator';
import { Roles } from 'src/shared/decorators/roles.decorator';
import { ListApprovalRulesUseCase } from '../application/list-approval-rules.use-case';
import { ReplaceApprovalMatrixUseCase } from '../application/replace-approval-matrix.use-case';
import { ResolveApprovalRuleUseCase } from '../application/resolve-approval-rule.use-case';
import { ApprovalRuleResponseDto } from '../dto/approval-rule-response.dto';
import { ReplaceApprovalMatrixDto } from '../dto/replace-approval-matrix.dto';
import {
  ListApprovalRulesQueryDto,
  ResolveApprovalRuleQueryDto,
} from '../dto/resolve-approval-rule.dto';

@ApiTags('Matriz de Alçadas')
@ApiCookieAuth('access_token')
@Controller('approval-rules')
export class ApprovalRulesController {
  constructor(
    private readonly listApprovalRulesUseCase: ListApprovalRulesUseCase,
    private readonly replaceApprovalMatrixUseCase: ReplaceApprovalMatrixUseCase,
    private readonly resolveApprovalRuleUseCase: ResolveApprovalRuleUseCase,
  ) {}

  @Get()
  @Roles(CompanyMemberRole.APPROVER, CompanyMemberRole.FINANCE_ADMIN)
  @ApiOperation({
    summary: 'Listar faixas da matriz de alçadas',
    description:
      'Sem filtro, devolve todas as matrizes da empresa. Com costCenterId ou categoryId, devolve apenas a matriz específica daquela combinação.',
  })
  @ApiResponse({ status: 200, type: [ApprovalRuleResponseDto] })
  async list(
    @CurrentCompany() companyId: string,
    @Query() query: ListApprovalRulesQueryDto,
  ): Promise<ApprovalRuleResponseDto[]> {
    const rules = await this.listApprovalRulesUseCase.execute(companyId, {
      costCenterId: query.costCenterId,
      categoryId: query.categoryId,
    });
    return ApprovalRuleResponseDto.fromEntities(rules);
  }

  @Get('resolve')
  @Roles(CompanyMemberRole.APPROVER, CompanyMemberRole.FINANCE_ADMIN)
  @ApiOperation({
    summary: 'Resolver qual faixa se aplica a um valor',
    description:
      'Aplica a precedência de especificidade (RF35): Centro de Custo + categoria, depois Centro de Custo, depois categoria, e por fim a matriz global. Determinístico, sem inferência (RNF15).',
  })
  @ApiResponse({ status: 200, type: ApprovalRuleResponseDto })
  @ApiResponse({ status: 400, description: 'Nenhuma faixa cobre o valor' })
  async resolve(
    @CurrentCompany() companyId: string,
    @Query() query: ResolveApprovalRuleQueryDto,
  ): Promise<ApprovalRuleResponseDto> {
    const rule = await this.resolveApprovalRuleUseCase.execute(companyId, {
      amountCents: query.amountCents,
      costCenterId: query.costCenterId ?? null,
      categoryId: query.categoryId ?? null,
    });
    return ApprovalRuleResponseDto.fromEntity(rule);
  }

  @Put()
  @Roles(CompanyMemberRole.FINANCE_ADMIN)
  @ApiOperation({
    summary: 'Substituir uma matriz de alçadas',
    description:
      'Grava a matriz inteira de uma especificidade de uma vez. As faixas precisam começar em zero, ser contíguas e terminar sem teto: buraco ou sobreposição é rejeitado. A alteração vale apenas para novas requisições (RN22).',
  })
  @ApiResponse({ status: 200, type: [ApprovalRuleResponseDto] })
  @ApiResponse({
    status: 400,
    description:
      'Buraco, sobreposição ou faixa sem teto fora da última posição',
  })
  async replace(
    @CurrentCompany() companyId: string,
    @Body() dto: ReplaceApprovalMatrixDto,
  ): Promise<ApprovalRuleResponseDto[]> {
    const rules = await this.replaceApprovalMatrixUseCase.execute(
      companyId,
      dto,
    );
    return ApprovalRuleResponseDto.fromEntities(rules);
  }

  @Delete()
  @Roles(CompanyMemberRole.FINANCE_ADMIN)
  @ApiOperation({
    summary: 'Remover uma matriz específica',
    description:
      'Apaga a matriz de um Centro de Custo ou categoria, fazendo os pedidos daquela combinação voltarem a cair na matriz global. A matriz global não pode ser removida.',
  })
  @ApiResponse({ status: 200, type: [ApprovalRuleResponseDto] })
  @ApiResponse({
    status: 400,
    description: 'A matriz global não pode ficar vazia',
  })
  async remove(
    @CurrentCompany() companyId: string,
    @Query() query: ListApprovalRulesQueryDto,
  ): Promise<ApprovalRuleResponseDto[]> {
    const rules = await this.replaceApprovalMatrixUseCase.execute(companyId, {
      costCenterId: query.costCenterId,
      categoryId: query.categoryId,
      ranges: [],
    });
    return ApprovalRuleResponseDto.fromEntities(rules);
  }
}
