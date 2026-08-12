import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AssignPlanUseCase } from 'src/modules/billing/application/assign-plan.use-case';
import { GrantFeatureOverrideUseCase } from 'src/modules/billing/application/grant-feature-override.use-case';
import { ListPlansUseCase } from 'src/modules/billing/application/list-plans.use-case';
import { PlanResponseDto } from 'src/modules/billing/dto/subscription-response.dto';
import { PaginatedResponseDto } from 'src/shared/dto/paginated-response.dto';
import { SuperAdminGuard } from 'src/shared/guards/super-admin.guard';
import { ListOrganizationsUseCase } from '../application/list-organizations.use-case';
import {
  AssignPlanDto,
  GrantFeatureOverrideDto,
  ListOrganizationsQueryDto,
  OrganizationResponseDto,
  PlatformSubscriptionResponseDto,
} from '../dto/platform.dto';

@ApiTags('Plataforma (SuperAdmin)')
@ApiCookieAuth('access_token')
@UseGuards(SuperAdminGuard)
@Controller('platform')
export class PlatformController {
  constructor(
    private readonly listOrganizationsUseCase: ListOrganizationsUseCase,
    private readonly listPlansUseCase: ListPlansUseCase,
    private readonly assignPlanUseCase: AssignPlanUseCase,
    private readonly grantFeatureOverrideUseCase: GrantFeatureOverrideUseCase,
  ) {}

  @Get('organizations')
  @ApiOperation({ summary: 'Listar e auditar organizações (RF85)' })
  @ApiResponse({ status: 200, type: PaginatedResponseDto })
  async organizations(
    @Query() query: ListOrganizationsQueryDto,
  ): Promise<PaginatedResponseDto<OrganizationResponseDto>> {
    const page = await this.listOrganizationsUseCase.execute(
      query,
      query.search,
    );

    return PaginatedResponseDto.from(page, OrganizationResponseDto.fromSummary);
  }

  @Get('plans')
  @ApiOperation({ summary: 'Planos comerciais cadastrados (RF81)' })
  @ApiResponse({ status: 200, type: [PlanResponseDto] })
  async plans(): Promise<PlanResponseDto[]> {
    const plans = await this.listPlansUseCase.execute();

    return plans.map(PlanResponseDto.fromEntity);
  }

  @Post('organizations/:companyId/plan')
  @ApiOperation({
    summary: 'Atribuir ou trocar o plano (RF84)',
    description: 'Encerra a assinatura anterior antes de abrir a nova (RN48).',
  })
  @ApiResponse({ status: 201, type: PlatformSubscriptionResponseDto })
  async assignPlan(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Body() dto: AssignPlanDto,
  ): Promise<PlatformSubscriptionResponseDto> {
    const subscription = await this.assignPlanUseCase.execute(companyId, {
      planId: dto.planId,
      status: dto.status,
      periodEnd: dto.periodEnd ?? null,
      contractedPriceCents: dto.contractedPriceCents ?? null,
    });

    return toSubscriptionDto(subscription);
  }

  @Post('organizations/:companyId/feature-overrides')
  @ApiOperation({
    summary: 'Conceder exceção de funcionalidade (RF84, RN51)',
    description:
      'A lista informada passa a valer no lugar da do plano até a data de expiração. Lista vazia remove a exceção.',
  })
  @ApiResponse({ status: 201, type: PlatformSubscriptionResponseDto })
  @ApiResponse({ status: 409, description: 'Organização sem assinatura ativa' })
  async grantOverride(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Body() dto: GrantFeatureOverrideDto,
  ): Promise<PlatformSubscriptionResponseDto> {
    const subscription = await this.grantFeatureOverrideUseCase.execute(
      companyId,
      { features: dto.features, expiresAt: dto.expiresAt ?? null },
    );

    return toSubscriptionDto(subscription);
  }
}

function toSubscriptionDto(subscription: {
  id: string;
  planId: string;
  status: PlatformSubscriptionResponseDto['status'];
  periodStart: Date;
  periodEnd: Date | null;
  featureOverrides: {
    features: readonly string[];
    expiresAt: Date | null;
  } | null;
}): PlatformSubscriptionResponseDto {
  const dto = new PlatformSubscriptionResponseDto();

  dto.id = subscription.id;
  dto.planId = subscription.planId;
  dto.status = subscription.status;
  dto.periodStart = subscription.periodStart;
  dto.periodEnd = subscription.periodEnd;
  dto.featureOverrides = [...(subscription.featureOverrides?.features ?? [])];
  dto.overridesExpireAt = subscription.featureOverrides?.expiresAt ?? null;

  return dto;
}
