import {
  Body,
  Controller,
  Get,
  Param,
  ParseBoolPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiCookieAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CompanyMemberRole } from 'generated/prisma/enums';
import { RequestActor } from 'src/modules/purchase-requests/application/find-request-by-id.use-case';
import {
  ALL_ROLES,
  CurrentActor,
} from 'src/modules/purchase-requests/infrastructure/request-actor';
import { Roles } from 'src/shared/decorators/roles.decorator';
import { ValidationError } from 'src/shared/domain/errors/domain.error';
import { ApplyModelChartUseCase } from '../application/apply-model-chart.use-case';
import { CreateChartAccountUseCase } from '../application/create-chart-account.use-case';
import { FindChartAccountByIdUseCase } from '../application/find-chart-account-by-id.use-case';
import { ImportChartAccountsUseCase } from '../application/import-chart-accounts.use-case';
import { ListChartAccountsUseCase } from '../application/list-chart-accounts.use-case';
import { SetChartAccountActiveUseCase } from '../application/set-chart-account-active.use-case';
import { UpdateChartAccountUseCase } from '../application/update-chart-account.use-case';
import {
  ChartAccountResponseDto,
  ChartImportResponseDto,
  ModelChartResponseDto,
} from '../dto/chart-account-response.dto';
import { CreateChartAccountDto } from '../dto/create-chart-account.dto';
import { SetChartAccountActiveDto } from '../dto/set-chart-account-active.dto';
import { UpdateChartAccountDto } from '../dto/update-chart-account.dto';

interface UploadedFileLike {
  originalname: string;
  buffer: Buffer;
}

const MAX_IMPORT_BYTES = 1024 * 1024;

@ApiTags('Plano de Contas')
@ApiCookieAuth('access_token')
@Controller('chart-accounts')
export class ChartAccountsController {
  constructor(
    private readonly listChartAccountsUseCase: ListChartAccountsUseCase,
    private readonly findChartAccountByIdUseCase: FindChartAccountByIdUseCase,
    private readonly createChartAccountUseCase: CreateChartAccountUseCase,
    private readonly updateChartAccountUseCase: UpdateChartAccountUseCase,
    private readonly setChartAccountActiveUseCase: SetChartAccountActiveUseCase,
    private readonly importChartAccountsUseCase: ImportChartAccountsUseCase,
    private readonly applyModelChartUseCase: ApplyModelChartUseCase,
  ) {}

  @Get()
  @Roles(...ALL_ROLES, CompanyMemberRole.ACCOUNTANT)
  @ApiOperation({
    summary: 'Listar o plano de contas',
    description:
      'Ordenado pelo código. Por padrão devolve apenas contas ativas.',
  })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
  @ApiResponse({ status: 200, type: [ChartAccountResponseDto] })
  async list(
    @CurrentActor() actor: RequestActor,
    @Query('includeInactive', new ParseBoolPipe({ optional: true }))
    includeInactive?: boolean,
  ): Promise<ChartAccountResponseDto[]> {
    const accounts = await this.listChartAccountsUseCase.execute(
      actor.companyId,
      { includeInactive },
    );
    return ChartAccountResponseDto.fromEntities(accounts);
  }

  @Post('model')
  @Roles(CompanyMemberRole.FINANCE_ADMIN)
  @ApiOperation({
    summary: 'Aplicar o plano de contas modelo',
    description:
      'Cria um plano enxuto de despesas, custos e imobilizado e liga as categorias padrão às contas. Só funciona em empresas sem plano.',
  })
  @ApiResponse({ status: 201, type: ModelChartResponseDto })
  @ApiResponse({ status: 409, description: 'A empresa já tem plano de contas' })
  async applyModel(
    @CurrentActor() actor: RequestActor,
  ): Promise<ModelChartResponseDto> {
    return this.applyModelChartUseCase.execute(actor.companyId, actor.userId);
  }

  @Post('import')
  @Roles(CompanyMemberRole.FINANCE_ADMIN)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_IMPORT_BYTES, files: 1 },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiOperation({
    summary: 'Importar plano de contas por planilha CSV',
    description:
      'Colunas codigo e nome obrigatórias; natureza, analitica e codigo_erp opcionais. Contas já existentes têm nome e código do ERP atualizados. Qualquer problema cancela a importação inteira.',
  })
  @ApiResponse({ status: 201, type: ChartImportResponseDto })
  async import(
    @CurrentActor() actor: RequestActor,
    @UploadedFile() file: UploadedFileLike | undefined,
  ): Promise<ChartImportResponseDto> {
    if (!file) {
      throw new ValidationError('Nenhum arquivo enviado no campo "file"');
    }

    const { created, updated } = await this.importChartAccountsUseCase.execute(
      actor.companyId,
      actor.userId,
      file.buffer.toString('utf-8'),
    );

    return { created, updated };
  }

  @Get(':id')
  @Roles(...ALL_ROLES, CompanyMemberRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Buscar conta contábil por ID' })
  @ApiResponse({ status: 200, type: ChartAccountResponseDto })
  async findById(
    @CurrentActor() actor: RequestActor,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ChartAccountResponseDto> {
    const account = await this.findChartAccountByIdUseCase.execute(
      id,
      actor.companyId,
    );
    return ChartAccountResponseDto.fromEntity(account);
  }

  @Post()
  @Roles(CompanyMemberRole.FINANCE_ADMIN)
  @ApiOperation({ summary: 'Criar conta contábil' })
  @ApiResponse({ status: 201, type: ChartAccountResponseDto })
  @ApiResponse({ status: 409, description: 'Código já usado no plano' })
  async create(
    @CurrentActor() actor: RequestActor,
    @Body() dto: CreateChartAccountDto,
  ): Promise<ChartAccountResponseDto> {
    const account = await this.createChartAccountUseCase.execute(
      actor.companyId,
      actor.userId,
      dto,
    );
    return ChartAccountResponseDto.fromEntity(account);
  }

  @Patch(':id')
  @Roles(CompanyMemberRole.FINANCE_ADMIN)
  @ApiOperation({
    summary: 'Editar conta contábil',
    description: 'Código e natureza não mudam depois de criados.',
  })
  @ApiResponse({ status: 200, type: ChartAccountResponseDto })
  async update(
    @CurrentActor() actor: RequestActor,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateChartAccountDto,
  ): Promise<ChartAccountResponseDto> {
    const account = await this.updateChartAccountUseCase.execute(
      id,
      actor.companyId,
      actor.userId,
      dto,
    );
    return ChartAccountResponseDto.fromEntity(account);
  }

  @Patch(':id/active')
  @Roles(CompanyMemberRole.FINANCE_ADMIN)
  @ApiOperation({
    summary: 'Ativar ou inativar conta contábil',
    description:
      'Contas nunca são excluídas, para preservar o histórico dos rateios.',
  })
  @ApiResponse({ status: 200, type: ChartAccountResponseDto })
  async setActive(
    @CurrentActor() actor: RequestActor,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetChartAccountActiveDto,
  ): Promise<ChartAccountResponseDto> {
    const account = await this.setChartAccountActiveUseCase.execute(
      id,
      actor.companyId,
      actor.userId,
      dto.active,
    );
    return ChartAccountResponseDto.fromEntity(account);
  }
}
