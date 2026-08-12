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
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from 'src/shared/decorators/roles.decorator';
import { PaginatedResponseDto } from 'src/shared/dto/paginated-response.dto';
import { CancelRequestUseCase } from '../application/cancel-request.use-case';
import { CreateDraftUseCase } from '../application/create-draft.use-case';
import { DecideRequestUseCase } from '../application/decide-request.use-case';
import { DeleteDraftUseCase } from '../application/delete-draft.use-case';
import { DuplicateRequestUseCase } from '../application/duplicate-request.use-case';
import {
  FindRequestByIdUseCase,
  RequestActor,
} from '../application/find-request-by-id.use-case';
import { GetRequestTimelineUseCase } from '../application/get-request-timeline.use-case';
import {
  ListRequestsUseCase,
  RequestView,
} from '../application/list-requests.use-case';
import { ReassignStepUseCase } from '../application/reassign-step.use-case';
import { SubmitRequestUseCase } from '../application/submit-request.use-case';
import { UpdateDraftUseCase } from '../application/update-draft.use-case';
import { CancelRequestDto } from '../dto/cancel-request.dto';
import { CreateDraftDto } from '../dto/create-draft.dto';
import { DecideRequestDto } from '../dto/decide-request.dto';
import { ListRequestsQueryDto } from '../dto/list-requests-query.dto';
import { PurchaseRequestResponseDto } from '../dto/purchase-request-response.dto';
import { ReassignStepDto } from '../dto/reassign-step.dto';
import { RequestTimelineResponseDto } from '../dto/request-timeline-response.dto';
import { SubmitRequestDto } from '../dto/submit-request.dto';
import { UpdateDraftDto } from '../dto/update-draft.dto';
import { ALL_ROLES, APPROVER_ROLES, CurrentActor } from './request-actor';

@ApiTags('Pedidos de Compra')
@ApiCookieAuth('access_token')
@Controller('purchase-requests')
export class PurchaseRequestsController {
  constructor(
    private readonly createDraftUseCase: CreateDraftUseCase,
    private readonly updateDraftUseCase: UpdateDraftUseCase,
    private readonly deleteDraftUseCase: DeleteDraftUseCase,
    private readonly duplicateRequestUseCase: DuplicateRequestUseCase,
    private readonly findRequestByIdUseCase: FindRequestByIdUseCase,
    private readonly listRequestsUseCase: ListRequestsUseCase,
    private readonly getRequestTimelineUseCase: GetRequestTimelineUseCase,
    private readonly submitRequestUseCase: SubmitRequestUseCase,
    private readonly decideRequestUseCase: DecideRequestUseCase,
    private readonly cancelRequestUseCase: CancelRequestUseCase,
    private readonly reassignStepUseCase: ReassignStepUseCase,
  ) {}

  @Post()
  @Roles(...ALL_ROLES)
  @ApiOperation({
    summary: 'Criar rascunho de pedido',
    description:
      'Nasce em DRAFT com número legível REQ-AAAA-NNNN. Rascunho não consome saldo, não notifica e não entra em métricas (RN37).',
  })
  @ApiResponse({ status: 201, type: PurchaseRequestResponseDto })
  async create(
    @CurrentActor() actor: RequestActor,
    @Body() dto: CreateDraftDto,
  ): Promise<PurchaseRequestResponseDto> {
    const request = await this.createDraftUseCase.execute(
      actor.companyId,
      actor.memberId,
      dto,
      actor.userId,
    );
    return PurchaseRequestResponseDto.fromEntity(request);
  }

  @Get()
  @Roles(...ALL_ROLES)
  @ApiOperation({
    summary: 'Listar pedidos conforme o perfil (RF56–RF59)',
    description:
      'view=MINE devolve os do próprio usuário; PENDING_FOR_ME as pendências; ALL respeita a RN43 conforme a role. O filtro é aplicado no banco, nunca em memória.',
  })
  @ApiResponse({ status: 200, type: PaginatedResponseDto })
  async list(
    @CurrentActor() actor: RequestActor,
    @Query() query: ListRequestsQueryDto,
    @Query('view') view: RequestView = RequestView.MINE,
  ): Promise<PaginatedResponseDto<PurchaseRequestResponseDto>> {
    const page = await this.listRequestsUseCase.execute(actor, view, query);
    return PaginatedResponseDto.from(
      page,
      PurchaseRequestResponseDto.fromEntity,
    );
  }

  @Get(':id')
  @Roles(...ALL_ROLES)
  @ApiOperation({
    summary: 'Buscar pedido por ID',
    description:
      'Aplica a RN43: solicitante só acessa os próprios pedidos, mesmo informando o ID direto na URL.',
  })
  @ApiResponse({ status: 200, type: PurchaseRequestResponseDto })
  @ApiResponse({ status: 403, description: 'Sem acesso a este pedido (RN43)' })
  async findById(
    @CurrentActor() actor: RequestActor,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PurchaseRequestResponseDto> {
    const request = await this.findRequestByIdUseCase.execute(id, actor);
    return PurchaseRequestResponseDto.fromEntity(request);
  }

  @Get(':id/timeline')
  @Roles(...ALL_ROLES)
  @ApiOperation({
    summary: 'Linha do tempo do pedido (RF53)',
    description:
      'Mostra a cascata congelada na submissão, incluindo as etapas futuras ainda WAITING, com a atual destacada. Lê approval_steps: nunca recalcula a rota (RN22).',
  })
  @ApiResponse({ status: 200, type: RequestTimelineResponseDto })
  async timeline(
    @CurrentActor() actor: RequestActor,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<RequestTimelineResponseDto> {
    const timeline = await this.getRequestTimelineUseCase.execute(id, actor);
    return RequestTimelineResponseDto.fromTimeline(timeline);
  }

  @Patch(':id')
  @Roles(...ALL_ROLES)
  @ApiOperation({
    summary: 'Editar rascunho',
    description: 'Só o autor, e só enquanto o pedido estiver em DRAFT (RN38).',
  })
  @ApiResponse({ status: 200, type: PurchaseRequestResponseDto })
  @ApiResponse({ status: 422, description: 'Pedido já saiu do rascunho' })
  async update(
    @CurrentActor() actor: RequestActor,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDraftDto,
  ): Promise<PurchaseRequestResponseDto> {
    const request = await this.updateDraftUseCase.execute(id, actor, dto);
    return PurchaseRequestResponseDto.fromEntity(request);
  }

  @Delete(':id')
  @Roles(...ALL_ROLES)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Excluir rascunho' })
  @ApiResponse({ status: 204, description: 'Rascunho excluído' })
  async remove(
    @CurrentActor() actor: RequestActor,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.deleteDraftUseCase.execute(id, actor);
  }

  @Post(':id/duplicate')
  @Roles(...ALL_ROLES)
  @ApiOperation({
    summary: 'Duplicar pedido como novo rascunho (RF55)',
    description: 'Copia dados e itens. O novo pedido recebe número próprio.',
  })
  @ApiResponse({ status: 201, type: PurchaseRequestResponseDto })
  async duplicate(
    @CurrentActor() actor: RequestActor,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PurchaseRequestResponseDto> {
    const request = await this.duplicateRequestUseCase.execute(id, actor);
    return PurchaseRequestResponseDto.fromEntity(request);
  }

  @Post(':id/submit')
  @Roles(...ALL_ROLES)
  @ApiOperation({
    summary: 'Submeter o rascunho (RF52)',
    description:
      'Calcula a rota e a congela em approval_steps: todas as etapas de uma vez, e alterar a matriz depois não muda este pedido (RN22). CNPJ não-ATIVO bloqueia (RN34). Pedido parecido nos últimos 30 dias exige confirmDuplicate (RN36).',
  })
  @ApiResponse({ status: 201, type: PurchaseRequestResponseDto })
  @ApiResponse({ status: 422, description: 'Pedido não está mais em rascunho' })
  async submit(
    @CurrentActor() actor: RequestActor,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SubmitRequestDto,
  ): Promise<PurchaseRequestResponseDto> {
    const request = await this.submitRequestUseCase.execute(id, actor, dto);
    return PurchaseRequestResponseDto.fromEntity(request);
  }

  @Post(':id/decisions')
  @Roles(...APPROVER_ROLES)
  @ApiOperation({
    summary: 'Decidir a etapa atual (RF62, RF63, RF64)',
    description:
      'Aprovar, rejeitar ou devolver. Justificativa de no mínimo 10 caracteres em rejeição, devolução e ressalva (RN44). Rejeição encerra o fluxo na hora (RN25). A última aprovação debita o saldo (RN17). O contexto financeiro é congelado na decisão (RN47).',
  })
  @ApiResponse({ status: 201, type: PurchaseRequestResponseDto })
  @ApiResponse({
    status: 403,
    description: 'Etapa atribuída a outro aprovador',
  })
  async decide(
    @CurrentActor() actor: RequestActor,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DecideRequestDto,
  ): Promise<PurchaseRequestResponseDto> {
    const request = await this.decideRequestUseCase.execute(id, actor, dto);
    return PurchaseRequestResponseDto.fromEntity(request);
  }

  @Post(':id/cancel')
  @Roles(...ALL_ROLES)
  @ApiOperation({
    summary: 'Cancelar ou reverter o pedido (RF54)',
    description:
      'O Solicitante cancela enquanto não aprovado. Pedido aprovado só é revertido por Admin Financeiro, e a reversão devolve o valor via lançamento REVERSAL, nunca editando o consumo original (RN41).',
  })
  @ApiResponse({ status: 201, type: PurchaseRequestResponseDto })
  @ApiResponse({
    status: 403,
    description: 'Aprovado exige Admin Financeiro (RN41)',
  })
  async cancel(
    @CurrentActor() actor: RequestActor,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelRequestDto,
  ): Promise<PurchaseRequestResponseDto> {
    const request = await this.cancelRequestUseCase.execute(id, actor, dto);
    return PurchaseRequestResponseDto.fromEntity(request);
  }

  @Post(':id/reassign')
  @Roles(...APPROVER_ROLES)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Reatribuir a etapa atual (RF68)',
    description:
      'Só Admin Financeiro, e o destino precisa de alçada equivalente à do aprovador original (RN33).',
  })
  @ApiResponse({ status: 204, description: 'Etapa reatribuída' })
  async reassign(
    @CurrentActor() actor: RequestActor,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReassignStepDto,
  ): Promise<void> {
    await this.reassignStepUseCase.execute(id, actor, dto.toMemberId);
  }
}
