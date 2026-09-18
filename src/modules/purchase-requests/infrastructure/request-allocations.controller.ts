import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Put,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from 'src/shared/decorators/roles.decorator';
import { RequestActor } from '../application/find-request-by-id.use-case';
import { ManageRequestAllocationsUseCase } from '../application/manage-request-allocations.use-case';
import { ReplaceAllocationsDto } from '../dto/replace-allocations.dto';
import { RequestAllocationsResponseDto } from '../dto/request-allocations-response.dto';
import { ALL_ROLES, CurrentActor } from './request-actor';

@ApiTags('Pedidos de Compra')
@ApiCookieAuth('access_token')
@Controller('purchase-requests/:id/allocations')
export class RequestAllocationsController {
  constructor(
    private readonly manageRequestAllocationsUseCase: ManageRequestAllocationsUseCase,
  ) {}

  @Get()
  @Roles(...ALL_ROLES)
  @ApiOperation({
    summary: 'Rateio do pedido por centro de custo e conta contábil',
    description:
      'Sem rateio definido, devolve uma linha com 100% no centro de custo do pedido e a conta padrão da categoria.',
  })
  @ApiResponse({ status: 200, type: RequestAllocationsResponseDto })
  async list(
    @CurrentActor() actor: RequestActor,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<RequestAllocationsResponseDto> {
    const allocations = await this.manageRequestAllocationsUseCase.list(
      id,
      actor,
    );
    return RequestAllocationsResponseDto.fromAllocations(allocations);
  }

  @Put()
  @Roles(...ALL_ROLES)
  @ApiOperation({
    summary: 'Substituir o rateio do pedido',
    description:
      'No rascunho, quem criou define centros de custo, percentuais e contas. Depois do envio, o Admin Financeiro só troca a conta contábil de cada linha.',
  })
  @ApiResponse({ status: 200, type: RequestAllocationsResponseDto })
  async replace(
    @CurrentActor() actor: RequestActor,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReplaceAllocationsDto,
  ): Promise<RequestAllocationsResponseDto> {
    const allocations = await this.manageRequestAllocationsUseCase.replace(
      id,
      actor,
      dto,
    );
    return RequestAllocationsResponseDto.fromAllocations(allocations);
  }
}
