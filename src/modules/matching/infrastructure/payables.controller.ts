import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
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
import { ValidationError } from 'src/shared/domain/errors/domain.error';
import { ListPayablesUseCase } from '../application/list-payables.use-case';
import { MarkPayableAsPaidUseCase } from '../application/mark-payable-as-paid.use-case';
import { ReleasePayableWithoutInvoiceUseCase } from '../application/release-payable-without-invoice.use-case';
import { ListPayablesQueryDto } from '../dto/list-payables-query.dto';
import { PayableResponseDto } from '../dto/payable-response.dto';
import { ReleasePayableWithoutInvoiceDto } from '../dto/release-payable-without-invoice.dto';

interface UploadedFileLike {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
}

const MAX_UPLOAD_BYTES = Number(process.env.UPLOAD_MAX_SIZE_BYTES ?? 10485760);

@ApiTags('Contas a Pagar')
@ApiCookieAuth()
@Controller('payables')
export class PayablesController {
  constructor(
    private readonly listPayablesUseCase: ListPayablesUseCase,
    private readonly markPayableAsPaidUseCase: MarkPayableAsPaidUseCase,
    private readonly releasePayableWithoutInvoiceUseCase: ReleasePayableWithoutInvoiceUseCase,
  ) {}

  @Get()
  @Roles(...ALL_ROLES)
  @ApiOperation({ summary: 'Listar contas a pagar (RN61)' })
  @ApiResponse({ status: 200, type: PaginatedResponseDto })
  async list(
    @CurrentActor() actor: RequestActor,
    @Query() query: ListPayablesQueryDto,
  ): Promise<PaginatedResponseDto<PayableResponseDto>> {
    const page = await this.listPayablesUseCase.execute(
      actor.companyId,
      query,
    );

    return PaginatedResponseDto.from(page, PayableResponseDto.fromEntity);
  }

  @Post(':id/pay')
  @Roles(CompanyMemberRole.FINANCE_ADMIN)
  @ApiOperation({
    summary: 'Marcar como pago',
    description:
      'Registra que o pagamento foi feito. Não executa nenhuma transferência bancária.',
  })
  @ApiResponse({ status: 201, type: PayableResponseDto })
  async pay(
    @CurrentActor() actor: RequestActor,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PayableResponseDto> {
    const payable = await this.markPayableAsPaidUseCase.execute(id, actor);

    return PayableResponseDto.fromEntity(payable);
  }

  @Post('release-without-invoice')
  @Roles(CompanyMemberRole.FINANCE_ADMIN)
  @UseInterceptors(
    FileInterceptor('proof', { limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 } }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        proof: { type: 'string', format: 'binary' },
        supplierId: { type: 'string', format: 'uuid' },
        amountCents: { type: 'string' },
        dueDate: { type: 'string' },
        note: { type: 'string' },
      },
    },
  })
  @ApiOperation({
    summary: 'Liberar pagamento sem nota fiscal conferível (RN65, RN66)',
    description:
      'Para compras sem NFe (assinatura de software, serviço no exterior). Exige perfil de Admin Financeiro e comprovante anexado.',
  })
  @ApiResponse({ status: 201, type: PayableResponseDto })
  async releaseWithoutInvoice(
    @CurrentActor() actor: RequestActor,
    @Body() dto: ReleasePayableWithoutInvoiceDto,
    @UploadedFile() proof: UploadedFileLike | undefined,
  ): Promise<PayableResponseDto> {
    if (!proof) {
      throw new ValidationError('Nenhum comprovante enviado no campo "proof"');
    }

    const payable = await this.releasePayableWithoutInvoiceUseCase.execute(
      actor,
      dto,
      proof,
    );

    return PayableResponseDto.fromEntity(payable);
  }
}
