import { Controller, Get } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CompanyMemberRole } from 'generated/prisma/enums';
import { CurrentCompany } from 'src/shared/decorators/current-company.decorator';
import { Roles } from 'src/shared/decorators/roles.decorator';
import { GetSubscriptionUsageUseCase } from '../application/get-subscription-usage.use-case';
import { ListPlansUseCase } from '../application/list-plans.use-case';
import {
  PlanResponseDto,
  SubscriptionResponseDto,
} from '../dto/subscription-response.dto';

@ApiTags('Plano e assinatura')
@ApiCookieAuth('access_token')
@Controller('billing')
export class BillingController {
  constructor(
    private readonly getSubscriptionUsageUseCase: GetSubscriptionUsageUseCase,
    private readonly listPlansUseCase: ListPlansUseCase,
  ) {}

  @Get('subscription')
  @Roles(CompanyMemberRole.FINANCE_ADMIN)
  @ApiOperation({
    summary: 'Plano vigente e consumo dos limites (RF86)',
    description: 'Inclui a data de renovação e as vagas já ocupadas.',
  })
  @ApiResponse({ status: 200, type: SubscriptionResponseDto })
  async subscription(
    @CurrentCompany() companyId: string,
  ): Promise<SubscriptionResponseDto> {
    const usage = await this.getSubscriptionUsageUseCase.execute(companyId);

    return SubscriptionResponseDto.fromUsage(usage);
  }

  @Get('plans')
  @Roles(CompanyMemberRole.FINANCE_ADMIN)
  @ApiOperation({ summary: 'Planos disponíveis para upgrade (RF81)' })
  @ApiResponse({ status: 200, type: [PlanResponseDto] })
  async plans(): Promise<PlanResponseDto[]> {
    const plans = await this.listPlansUseCase.execute();

    return plans.map(PlanResponseDto.fromEntity);
  }
}
