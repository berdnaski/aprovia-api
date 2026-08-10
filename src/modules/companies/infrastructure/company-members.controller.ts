import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CompanyMemberRole } from 'generated/prisma/enums';
import { CurrentCompany } from 'src/shared/decorators/current-company.decorator';
import { CurrentMember } from 'src/shared/decorators/current-member.decorator';
import { Roles } from 'src/shared/decorators/roles.decorator';
import { DisableMemberUseCase } from '../application/disable-member.use-case';
import { FindMemberByIdUseCase } from '../application/find-member-by-id.use-case';
import { ListCompanyMembersUseCase } from '../application/list-company-members.use-case';
import { SetMemberManagerUseCase } from '../application/set-member-manager.use-case';
import { SetMemberSubstituteUseCase } from '../application/set-member-substitute.use-case';
import { UpdateMemberLimitUseCase } from '../application/update-member-limit.use-case';
import { UpdateMemberRoleUseCase } from '../application/update-member-role.use-case';
import { CompanyMemberResponseDto } from '../dto/company-member-response.dto';
import { SetMemberManagerDto } from '../dto/set-member-manager.dto';
import { SetMemberSubstituteDto } from '../dto/set-member-substitute.dto';
import { UpdateMemberLimitDto } from '../dto/update-member-limit.dto';
import { UpdateMemberRoleDto } from '../dto/update-member-role.dto';

@ApiTags('Membros')
@ApiCookieAuth('access_token')
@Controller('members')
export class CompanyMembersController {
  constructor(
    private readonly listCompanyMembersUseCase: ListCompanyMembersUseCase,
    private readonly findMemberByIdUseCase: FindMemberByIdUseCase,
    private readonly updateMemberRoleUseCase: UpdateMemberRoleUseCase,
    private readonly updateMemberLimitUseCase: UpdateMemberLimitUseCase,
    private readonly setMemberManagerUseCase: SetMemberManagerUseCase,
    private readonly setMemberSubstituteUseCase: SetMemberSubstituteUseCase,
    private readonly disableMemberUseCase: DisableMemberUseCase,
  ) {}

  @Get()
  @Roles(CompanyMemberRole.APPROVER, CompanyMemberRole.FINANCE_ADMIN)
  @ApiOperation({ summary: 'Listar membros da empresa' })
  @ApiResponse({ status: 200, type: [CompanyMemberResponseDto] })
  async list(
    @CurrentCompany() companyId: string,
  ): Promise<CompanyMemberResponseDto[]> {
    const members = await this.listCompanyMembersUseCase.execute(companyId);
    return CompanyMemberResponseDto.fromEntities(members);
  }

  @Get(':id')
  @Roles(CompanyMemberRole.APPROVER, CompanyMemberRole.FINANCE_ADMIN)
  @ApiOperation({ summary: 'Buscar membro por ID' })
  @ApiResponse({ status: 200, type: CompanyMemberResponseDto })
  @ApiResponse({ status: 404, description: 'Membro não encontrado' })
  async findById(
    @CurrentCompany() companyId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CompanyMemberResponseDto> {
    const member = await this.findMemberByIdUseCase.execute(id, companyId);
    return CompanyMemberResponseDto.fromEntity(member);
  }

  @Patch(':id/role')
  @Roles(CompanyMemberRole.FINANCE_ADMIN)
  @ApiOperation({
    summary: 'Alterar papel do membro',
    description:
      'A empresa deve manter ao menos um Admin Financeiro ativo (RN03).',
  })
  @ApiResponse({ status: 200, type: CompanyMemberResponseDto })
  @ApiResponse({ status: 409, description: 'Último Admin Financeiro' })
  async updateRole(
    @CurrentCompany() companyId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMemberRoleDto,
  ): Promise<CompanyMemberResponseDto> {
    const member = await this.updateMemberRoleUseCase.execute(
      id,
      companyId,
      dto.role,
    );
    return CompanyMemberResponseDto.fromEntity(member);
  }

  @Patch(':id/limit')
  @Roles(CompanyMemberRole.FINANCE_ADMIN)
  @ApiOperation({
    summary: 'Definir alçada de aprovação',
    description: 'Zero significa que o membro não aprova nenhum valor.',
  })
  @ApiResponse({ status: 200, type: CompanyMemberResponseDto })
  async updateLimit(
    @CurrentCompany() companyId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMemberLimitDto,
  ): Promise<CompanyMemberResponseDto> {
    const member = await this.updateMemberLimitUseCase.execute(
      id,
      companyId,
      dto.approvalLimitCents,
    );
    return CompanyMemberResponseDto.fromEntity(member);
  }

  @Patch(':id/manager')
  @Roles(CompanyMemberRole.FINANCE_ADMIN)
  @ApiOperation({
    summary: 'Definir líder direto',
    description:
      'Forma a árvore de hierarquia percorrida pela cascata de aprovação (RN24). Ciclos são rejeitados.',
  })
  @ApiResponse({ status: 200, type: CompanyMemberResponseDto })
  @ApiResponse({ status: 400, description: 'Ciclo na hierarquia' })
  async setManager(
    @CurrentCompany() companyId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetMemberManagerDto,
  ): Promise<CompanyMemberResponseDto> {
    const member = await this.setMemberManagerUseCase.execute(
      id,
      companyId,
      dto.managerId ?? null,
    );
    return CompanyMemberResponseDto.fromEntity(member);
  }

  @Patch('me/substitute')
  @Roles(CompanyMemberRole.APPROVER, CompanyMemberRole.FINANCE_ADMIN)
  @ApiOperation({
    summary: 'Definir substituto temporário',
    description:
      'Durante a ausência, as pendências são roteadas ao substituto (RN29). Subdelegação em cadeia é vedada (RN30).',
  })
  @ApiResponse({ status: 200, type: CompanyMemberResponseDto })
  async setSubstitute(
    @CurrentMember() memberId: string,
    @CurrentCompany() companyId: string,
    @Body() dto: SetMemberSubstituteDto,
  ): Promise<CompanyMemberResponseDto> {
    const member = await this.setMemberSubstituteUseCase.execute(
      memberId,
      companyId,
      dto,
    );
    return CompanyMemberResponseDto.fromEntity(member);
  }

  @Delete(':id')
  @Roles(CompanyMemberRole.FINANCE_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Inativar membro',
    description:
      'Preserva o histórico de requisições e decisões (RN08). O último Admin Financeiro não pode ser inativado (RN03).',
  })
  @ApiResponse({ status: 204, description: 'Membro inativado' })
  @ApiResponse({ status: 409, description: 'Último Admin Financeiro' })
  async disable(
    @CurrentMember() memberId: string,
    @CurrentCompany() companyId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.disableMemberUseCase.execute(
      id,
      companyId,
      memberId,
    );
  }

}
