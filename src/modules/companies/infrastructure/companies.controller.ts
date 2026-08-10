import { Body, Controller, Get, Patch, Post, UseInterceptors } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CompanyMemberRole } from 'generated/prisma/enums';
import { AuthCookiesInterceptor } from 'src/modules/auth/infrastructure/interceptors/auth-cookies.interceptor';
import { CurrentCompany } from 'src/shared/decorators/current-company.decorator';
import { CurrentUser } from 'src/shared/decorators/current-user.decorator';
import { Roles } from 'src/shared/decorators/roles.decorator';
import { AuthenticatedUser } from 'src/shared/domain/authenticated-user';
import { CreateCompanyUseCase } from '../application/create-company.use-case';
import { FindCompanyByIdUseCase } from '../application/find-company-by-id.use-case';
import { UpdateCompanyPolicyUseCase } from '../application/update-company-policy.use-case';
import { UpdateCompanyUseCase } from '../application/update-company.use-case';
import { CompanyResponseDto } from '../dto/company-response.dto';
import { CreateCompanyDto } from '../dto/create-company.dto';
import { UpdateCompanyPolicyDto } from '../dto/update-company-policy.dto';
import { UpdateCompanyDto } from '../dto/update-company.dto';

@ApiTags('Empresas')
@ApiCookieAuth('access_token')
@Controller('companies')
export class CompaniesController {
  constructor(
    private readonly createCompanyUseCase: CreateCompanyUseCase,
    private readonly findCompanyByIdUseCase: FindCompanyByIdUseCase,
    private readonly updateCompanyUseCase: UpdateCompanyUseCase,
    private readonly updateCompanyPolicyUseCase: UpdateCompanyPolicyUseCase,
  ) {}

  @Post()
  @UseInterceptors(AuthCookiesInterceptor)
  @ApiOperation({
    summary: 'Criar empresa',
    description:
      'Cria a empresa, vincula quem a criou como Admin Financeiro e já emite novos cookies de sessão com o contexto da empresa.',
  })
  @ApiResponse({ status: 201, type: CompanyResponseDto })
  @ApiResponse({
    status: 409,
    description: 'CNPJ já cadastrado ou usuário já pertence a uma empresa',
  })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCompanyDto,
  ) {
    const { company, tokens } = await this.createCompanyUseCase.execute(
      user.userId,
      dto,
    );

    return { ...CompanyResponseDto.fromEntity(company), tokens };
  }

  @Get('me')
  @ApiOperation({ summary: 'Dados da empresa ativa' })
  @ApiResponse({ status: 200, type: CompanyResponseDto })
  async findMine(
    @CurrentCompany() companyId: string,
  ): Promise<CompanyResponseDto> {
    const company = await this.findCompanyByIdUseCase.execute(companyId);
    return CompanyResponseDto.fromEntity(company);
  }

  @Patch('me')
  @Roles(CompanyMemberRole.FINANCE_ADMIN)
  @ApiOperation({ summary: 'Atualizar dados cadastrais' })
  @ApiResponse({ status: 200, type: CompanyResponseDto })
  async update(
    @CurrentCompany() companyId: string,
    @Body() dto: UpdateCompanyDto,
  ): Promise<CompanyResponseDto> {
    const company = await this.updateCompanyUseCase.execute(companyId, dto);
    return CompanyResponseDto.fromEntity(company);
  }

  @Patch('me/policy')
  @Roles(CompanyMemberRole.FINANCE_ADMIN)
  @ApiOperation({
    summary: 'Configurar parâmetros de política',
    description:
      'Tolerância de estouro (RN18), prazos de SLA (RN31/RN32) e valor crítico para dupla aprovação (RN26).',
  })
  @ApiResponse({ status: 200, type: CompanyResponseDto })
  async updatePolicy(
    @CurrentCompany() companyId: string,
    @Body() dto: UpdateCompanyPolicyDto,
  ): Promise<CompanyResponseDto> {
    const company = await this.updateCompanyPolicyUseCase.execute(
      companyId,
      dto,
    );
    return CompanyResponseDto.fromEntity(company);
  }
}
