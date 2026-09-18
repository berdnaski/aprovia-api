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
import { CompanyMemberRole } from 'generated/prisma/enums';
import { RequestActor } from 'src/modules/purchase-requests/application/find-request-by-id.use-case';
import { CurrentActor } from 'src/modules/purchase-requests/infrastructure/request-actor';
import { Roles } from 'src/shared/decorators/roles.decorator';
import { ManagePayableAllocationsUseCase } from '../application/manage-payable-allocations.use-case';
import { PayableAllocationResponseDto } from '../dto/payable-allocations-response.dto';
import { ReplacePayableAllocationsDto } from '../dto/replace-payable-allocations.dto';

@ApiTags('Contas a Pagar')
@ApiCookieAuth()
@Controller('payables/:id/allocations')
export class PayableAllocationsController {
  constructor(
    private readonly managePayableAllocationsUseCase: ManagePayableAllocationsUseCase,
  ) {}

  @Get()
  @Roles(CompanyMemberRole.FINANCE_ADMIN)
  @ApiOperation({
    summary: 'Rateio da conta a pagar por centro de custo e conta contábil',
  })
  @ApiResponse({ status: 200, type: [PayableAllocationResponseDto] })
  async list(
    @CurrentActor() actor: RequestActor,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PayableAllocationResponseDto[]> {
    const lines = await this.managePayableAllocationsUseCase.list(id, actor);
    return PayableAllocationResponseDto.fromEntities(lines);
  }

  @Put()
  @Roles(CompanyMemberRole.FINANCE_ADMIN)
  @ApiOperation({
    summary: 'Substituir o rateio da conta a pagar',
    description:
      'Recebe percentuais que somam 100% e grava os valores já calculados sobre o total da conta.',
  })
  @ApiResponse({ status: 200, type: [PayableAllocationResponseDto] })
  async replace(
    @CurrentActor() actor: RequestActor,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReplacePayableAllocationsDto,
  ): Promise<PayableAllocationResponseDto[]> {
    const lines = await this.managePayableAllocationsUseCase.replace(
      id,
      actor,
      dto,
    );
    return PayableAllocationResponseDto.fromEntities(lines);
  }
}
