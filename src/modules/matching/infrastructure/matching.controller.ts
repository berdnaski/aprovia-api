import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
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
import { PaginatedResponseDto } from 'src/shared/dto/paginated-response.dto';
import { FindMatchResultByIdUseCase } from '../application/find-match-result-by-id.use-case';
import { ListMatchResultsUseCase } from '../application/list-match-results.use-case';
import { OverrideMatchUseCase } from '../application/override-match.use-case';
import { RunMatchUseCase } from '../application/run-match.use-case';
import { ListMatchResultsQueryDto } from '../dto/list-match-results-query.dto';
import { MatchResultResponseDto } from '../dto/match-result-response.dto';
import { OverrideMatchDto } from '../dto/override-match.dto';

@ApiTags('Conferência')
@ApiCookieAuth()
@Controller('match-results')
export class MatchingController {
  constructor(
    private readonly listMatchResultsUseCase: ListMatchResultsUseCase,
    private readonly findMatchResultByIdUseCase: FindMatchResultByIdUseCase,
    private readonly overrideMatchUseCase: OverrideMatchUseCase,
  ) {}

  @Get()
  @Roles(...ALL_ROLES)
  @ApiOperation({
    summary: 'Fila de conferências (RN59)',
    description: 'Filtre por status=DIVERGENT para ver o que está pendente.',
  })
  @ApiResponse({ status: 200, type: PaginatedResponseDto })
  async list(
    @CurrentActor() actor: RequestActor,
    @Query() query: ListMatchResultsQueryDto,
  ): Promise<PaginatedResponseDto<MatchResultResponseDto>> {
    const page = await this.listMatchResultsUseCase.execute(
      actor.companyId,
      query,
    );

    return PaginatedResponseDto.from(page, MatchResultResponseDto.fromEntity);
  }

  @Get(':id')
  @Roles(...ALL_ROLES)
  @ApiOperation({ summary: 'Detalhar uma conferência com as divergências' })
  @ApiResponse({ status: 200, type: MatchResultResponseDto })
  async findById(
    @CurrentActor() actor: RequestActor,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<MatchResultResponseDto> {
    const match = await this.findMatchResultByIdUseCase.execute(
      id,
      actor.companyId,
    );

    return MatchResultResponseDto.fromEntity(match);
  }

  @Post(':id/override')
  @Roles(CompanyMemberRole.FINANCE_ADMIN)
  @ApiOperation({
    summary: 'Liberar a exceção e aprovar o pagamento (RN60, RN64)',
    description:
      'Use quando a divergência é aceitável (frete, arredondamento). Libera o pagamento correspondente.',
  })
  @ApiResponse({ status: 201, type: MatchResultResponseDto })
  async override(
    @CurrentActor() actor: RequestActor,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: OverrideMatchDto,
  ): Promise<MatchResultResponseDto> {
    const match = await this.overrideMatchUseCase.execute(id, actor, dto.note);

    return MatchResultResponseDto.fromEntity(match);
  }
}

@ApiTags('Notas Fiscais')
@ApiCookieAuth()
@Controller('invoices/:id')
export class InvoiceMatchController {
  constructor(private readonly runMatchUseCase: RunMatchUseCase) {}

  @Post('match')
  @Roles(CompanyMemberRole.FINANCE_ADMIN)
  @ApiOperation({
    summary: 'Rodar a conferência tripla (RN59)',
    description:
      'Compara pedido, recebimento e nota fiscal. Se bater, libera automaticamente a conta a pagar (RN61). Se divergir, gera uma exceção para revisão.',
  })
  @ApiResponse({ status: 201, type: MatchResultResponseDto })
  async match(
    @CurrentActor() actor: RequestActor,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<MatchResultResponseDto> {
    const match = await this.runMatchUseCase.execute(id, actor);

    return MatchResultResponseDto.fromEntity(match);
  }
}
