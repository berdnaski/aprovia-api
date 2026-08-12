import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiPropertyOptional,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { CompanyMemberRole, InviteStatus } from 'generated/prisma/enums';
import { CurrentCompany } from 'src/shared/decorators/current-company.decorator';
import { CurrentUser } from 'src/shared/decorators/current-user.decorator';
import { IsPublic } from 'src/shared/decorators/is-public.decorator';
import { Roles } from 'src/shared/decorators/roles.decorator';
import { AcceptInviteUseCase } from '../application/accept-invite.use-case';
import { CreateInviteUseCase } from '../application/create-invite.use-case';
import { ManageInvitesUseCase } from '../application/manage-invites.use-case';
import { CreateInviteDto } from '../dto/create-invite.dto';
import {
  InvitePreviewResponseDto,
  InviteResponseDto,
} from '../dto/invite-response.dto';

export class ListInvitesQueryDto {
  @ApiPropertyOptional({
    enum: ['PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED'],
  })
  @IsOptional()
  @IsEnum(InviteStatus)
  status?: InviteStatus;
}

@ApiTags('Convites')
@Controller('invites')
export class InvitesController {
  constructor(
    private readonly createInviteUseCase: CreateInviteUseCase,
    private readonly manageInvitesUseCase: ManageInvitesUseCase,
    private readonly acceptInviteUseCase: AcceptInviteUseCase,
  ) {}

  @Post()
  @ApiCookieAuth('access_token')
  @Roles(CompanyMemberRole.FINANCE_ADMIN)
  @ApiOperation({
    summary: 'Convidar por e-mail (RF19)',
    description:
      'Define papel, Centro de Custo padrão e líder direto. Bloqueia ao atingir o limite de membros do plano (RN49).',
  })
  @ApiResponse({ status: 201, type: InviteResponseDto })
  @ApiResponse({ status: 403, description: 'Limite de membros do plano' })
  @ApiResponse({ status: 409, description: 'Já existe convite pendente' })
  async create(
    @CurrentCompany() companyId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateInviteDto,
  ): Promise<InviteResponseDto> {
    const invite = await this.createInviteUseCase.execute(
      companyId,
      userId,
      dto,
    );

    return InviteResponseDto.fromEntity(invite);
  }

  @Get()
  @ApiCookieAuth('access_token')
  @Roles(CompanyMemberRole.FINANCE_ADMIN)
  @ApiOperation({ summary: 'Acompanhar os convites emitidos (RF21)' })
  @ApiResponse({ status: 200, type: [InviteResponseDto] })
  async list(
    @CurrentCompany() companyId: string,
    @Query() query: ListInvitesQueryDto,
  ): Promise<InviteResponseDto[]> {
    const invites = await this.manageInvitesUseCase.list(
      companyId,
      query.status,
    );

    return invites.map(InviteResponseDto.fromEntity);
  }

  @Post(':id/resend')
  @ApiCookieAuth('access_token')
  @Roles(CompanyMemberRole.FINANCE_ADMIN)
  @ApiOperation({
    summary: 'Reenviar convite pendente (RF21)',
    description: 'Reaproveita o registro e aposenta o link anterior (RN04).',
  })
  @ApiResponse({ status: 201, type: InviteResponseDto })
  async resend(
    @CurrentCompany() companyId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<InviteResponseDto> {
    const invite = await this.manageInvitesUseCase.resend(id, companyId);

    return InviteResponseDto.fromEntity(invite);
  }

  @Delete(':id')
  @ApiCookieAuth('access_token')
  @Roles(CompanyMemberRole.FINANCE_ADMIN)
  @ApiOperation({
    summary: 'Revogar convite pendente (RN06)',
    description: 'Invalida imediatamente o link já enviado.',
  })
  @ApiResponse({ status: 200, type: InviteResponseDto })
  async revoke(
    @CurrentCompany() companyId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<InviteResponseDto> {
    const invite = await this.manageInvitesUseCase.revoke(id, companyId);

    return InviteResponseDto.fromEntity(invite);
  }

  @Get('token/:token')
  @IsPublic()
  @ApiOperation({
    summary: 'Abrir o link do convite (RF20)',
    description:
      'Rota pública: mostra a organização e o papel antes de exigir conta. Não consome o convite.',
  })
  @ApiResponse({ status: 200, type: InvitePreviewResponseDto })
  async preview(
    @Param('token') token: string,
  ): Promise<InvitePreviewResponseDto> {
    const preview = await this.manageInvitesUseCase.preview(token);

    return InvitePreviewResponseDto.fromPreview(preview);
  }

  @Post('token/:token/accept')
  @ApiCookieAuth('access_token')
  @ApiOperation({
    summary: 'Aceitar o convite (RF20)',
    description:
      'Exige estar autenticado com o e-mail destinatário (RN05). O aceite invalida o token na hora.',
  })
  @ApiResponse({ status: 201, type: InviteResponseDto })
  @ApiResponse({ status: 403, description: 'E-mail diferente do convidado' })
  @ApiResponse({ status: 409, description: 'Convite já usado ou revogado' })
  async accept(
    @Param('token') token: string,
    @CurrentUser('userId') userId: string,
  ): Promise<InviteResponseDto> {
    const { invite } = await this.acceptInviteUseCase.execute(token, userId);

    return InviteResponseDto.fromEntity(invite);
  }
}
