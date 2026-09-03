import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ListPlansUseCase } from 'src/modules/billing/application/list-plans.use-case';
import { IsPublic } from 'src/shared/decorators/is-public.decorator';
import { JoinWaitlistUseCase } from '../application/join-waitlist.use-case';
import { JoinWaitlistDto } from '../dto/join-waitlist.dto';
import { PublicPlanDto, WaitlistJoinedDto } from '../dto/waitlist-response.dto';

@ApiTags('Site público')
@Controller()
export class MarketingController {
  constructor(
    private readonly listPlansUseCase: ListPlansUseCase,
    private readonly joinWaitlistUseCase: JoinWaitlistUseCase,
  ) {}

  @Get('public/plans')
  @IsPublic()
  @ApiOperation({
    summary: 'Planos ativos para exibir no site',
    description:
      'Mesma fonte da tela de planos do SuperAdmin. Mudou lá, muda no site.',
  })
  @ApiResponse({ status: 200, type: [PublicPlanDto] })
  async plans(): Promise<PublicPlanDto[]> {
    const plans = await this.listPlansUseCase.execute();

    return plans.map((plan) => ({
      id: plan.id,
      name: plan.name,
      tier: plan.tier,
      priceCents: plan.priceCents.toString(),
      maxRequestsMonth: plan.maxRequestsMonth,
      maxMembers: plan.maxMembers,
      features: [...plan.features],
    }));
  }

  @Post('public/waitlist')
  @IsPublic()
  @ApiOperation({ summary: 'Entrar na lista de espera' })
  @ApiResponse({ status: 201, type: WaitlistJoinedDto })
  async joinWaitlist(@Body() dto: JoinWaitlistDto): Promise<WaitlistJoinedDto> {
    return this.joinWaitlistUseCase.execute(dto);
  }
}
