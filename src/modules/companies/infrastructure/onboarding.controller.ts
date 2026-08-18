import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CompanyMemberRole } from 'generated/prisma/enums';
import { CnpjLookupOutcome } from 'src/modules/suppliers/domain/cnpj-lookup.provider';
import { CurrentCompany } from 'src/shared/decorators/current-company.decorator';
import { Roles } from 'src/shared/decorators/roles.decorator';
import { LookupCompanyCnpjUseCase } from '../application/lookup-company-cnpj.use-case';
import { ManageOnboardingUseCase } from '../application/manage-onboarding.use-case';
import { CompanyResponseDto } from '../dto/company-response.dto';
import {
  AdvanceOnboardingDto,
  OnboardingStatusResponseDto,
} from '../dto/onboarding-response.dto';

@ApiTags('Onboarding')
@ApiCookieAuth('access_token')
@Controller('onboarding')
export class OnboardingController {
  constructor(
    private readonly manageOnboardingUseCase: ManageOnboardingUseCase,
    private readonly lookupCompanyCnpjUseCase: LookupCompanyCnpjUseCase,
  ) {}

  @Get()
  @Roles(CompanyMemberRole.FINANCE_ADMIN)
  @ApiOperation({
    summary: 'Retomar a configuração inicial (RF11, RF16)',
    description:
      'Devolve a etapa em que parou e o que ainda falta para concluir (RN09/RN11).',
  })
  @ApiResponse({ status: 200, type: OnboardingStatusResponseDto })
  async status(
    @CurrentCompany() companyId: string,
  ): Promise<OnboardingStatusResponseDto> {
    const status = await this.manageOnboardingUseCase.status(companyId);

    return OnboardingStatusResponseDto.fromDomain(status);
  }

  @Patch('step')
  @Roles(CompanyMemberRole.FINANCE_ADMIN)
  @ApiOperation({
    summary: 'Registrar o avanço de etapa (RN11)',
    description:
      'O progresso nunca retrocede: rever uma etapa não desfaz nada.',
  })
  @ApiResponse({ status: 200, type: OnboardingStatusResponseDto })
  async advance(
    @CurrentCompany() companyId: string,
    @Body() dto: AdvanceOnboardingDto,
  ): Promise<OnboardingStatusResponseDto> {
    const status = await this.manageOnboardingUseCase.advance(
      companyId,
      dto.step,
    );

    return OnboardingStatusResponseDto.fromDomain(status);
  }

  @Post('complete')
  @Roles(CompanyMemberRole.FINANCE_ADMIN)
  @ApiOperation({
    summary: 'Concluir o onboarding (RF17)',
    description:
      'Provisiona a matriz de alçadas padrão se ainda não houver uma, e libera a criação de pedidos (RN10).',
  })
  @ApiResponse({ status: 201, type: CompanyResponseDto })
  @ApiResponse({ status: 409, description: 'Requisitos pendentes (RN09)' })
  async complete(
    @CurrentCompany() companyId: string,
  ): Promise<CompanyResponseDto> {
    const company = await this.manageOnboardingUseCase.complete(companyId);

    return CompanyResponseDto.fromEntity(company);
  }

  @Get('cnpj/:cnpj')
  @ApiOperation({
    summary: 'Pré-preencher os dados da organização pelo CNPJ (RF13)',
    description:
      'Exige apenas estar autenticado: é consultada antes de existir empresa, quando a sessão ainda não tem papel. Devolve só dados públicos da Receita.',
  })
  @ApiResponse({ status: 200, description: 'Dados públicos da Receita' })
  async lookupCnpj(@Param('cnpj') cnpj: string): Promise<CnpjLookupOutcome> {
    return this.lookupCompanyCnpjUseCase.execute(cnpj);
  }
}
