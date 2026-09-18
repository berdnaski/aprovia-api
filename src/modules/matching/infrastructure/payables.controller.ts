import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiCookieAuth,
  ApiOperation,
  ApiProduces,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CompanyMemberRole } from 'generated/prisma/enums';
import { RequestActor } from 'src/modules/purchase-requests/application/find-request-by-id.use-case';
import { CurrentActor } from 'src/modules/purchase-requests/infrastructure/request-actor';
import { Roles } from 'src/shared/decorators/roles.decorator';
import { PaginatedResponseDto } from 'src/shared/dto/paginated-response.dto';
import { ExportPayablesUseCase } from '../application/export-payables.use-case';
import { ListPayablesUseCase } from '../application/list-payables.use-case';
import { MarkPayableAsPaidUseCase } from '../application/mark-payable-as-paid.use-case';
import { ReleasePayableUseCase } from '../application/release-payable.use-case';
import { ReleasePayableWithoutInvoiceUseCase } from '../application/release-payable-without-invoice.use-case';
import { ExportPayablesQueryDto } from '../dto/export-payables-query.dto';
import { ListPayablesQueryDto } from '../dto/list-payables-query.dto';
import { PayableResponseDto } from '../dto/payable-response.dto';
import { ReleasePayableDto } from '../dto/release-payable.dto';
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
    private readonly releasePayableUseCase: ReleasePayableUseCase,
    private readonly releasePayableWithoutInvoiceUseCase: ReleasePayableWithoutInvoiceUseCase,
    private readonly exportPayablesUseCase: ExportPayablesUseCase,
  ) {}

  @Get('export')
  @Roles(CompanyMemberRole.FINANCE_ADMIN, CompanyMemberRole.ACCOUNTANT)
  @ApiProduces('text/csv')
  @ApiOperation({
    summary: 'Exportar contas pagas para lançamento no ERP',
    description:
      'CSV com uma linha por rateio (centro de custo × conta contábil), valor bruto, retenções (IRRF, INSS, PIS, COFINS, CSLL, ISS retido) e líquido pago. Layout genérico para importar em Omie, Conta Azul, Nibo ou qualquer outro ERP.',
  })
  @ApiResponse({ status: 200, description: 'Arquivo CSV' })
  @ApiResponse({ status: 400, description: 'Filtro devolve linhas demais' })
  async export(
    @CurrentActor() actor: RequestActor,
    @Query() query: ExportPayablesQueryDto,
    @Res() response: Response,
  ): Promise<void> {
    const file = await this.exportPayablesUseCase.execute(
      actor.companyId,
      query,
    );

    response.setHeader('Content-Type', file.contentType);
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${file.filename}"`,
    );
    response.setHeader('Content-Length', file.content.length);
    response.end(file.content);
  }

  @Get()
  @Roles(CompanyMemberRole.FINANCE_ADMIN, CompanyMemberRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Listar contas a pagar (RN61)' })
  @ApiResponse({ status: 200, type: PaginatedResponseDto })
  async list(
    @CurrentActor() actor: RequestActor,
    @Query() query: ListPayablesQueryDto,
  ): Promise<PaginatedResponseDto<PayableResponseDto>> {
    const page = await this.listPayablesUseCase.execute(actor.companyId, query);

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

  @Post(':id/release')
  @Roles(CompanyMemberRole.FINANCE_ADMIN)
  @ApiOperation({
    summary: 'Liberar o pagamento de uma nota conferida',
    description:
      'Para a conta que ficou aguardando liberação porque a empresa não libera sozinha quando a conferência bate. Só vale para nota com conferência aprovada.',
  })
  @ApiResponse({ status: 201, type: PayableResponseDto })
  async release(
    @CurrentActor() actor: RequestActor,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReleasePayableDto,
  ): Promise<PayableResponseDto> {
    const payable = await this.releasePayableUseCase.execute(
      id,
      actor,
      dto.note,
    );

    return PayableResponseDto.fromEntity(payable);
  }

  @Post('release-without-invoice')
  @Roles(CompanyMemberRole.FINANCE_ADMIN)
  @UseInterceptors(
    FileInterceptor('proof', {
      limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
    }),
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
      'Para compras sem NFe conferível (assinatura de software, serviço, frete, compra no exterior). Exige perfil de Admin Financeiro. O comprovante é obrigatório acima do valor definido em matchRequiredAboveCents.',
  })
  @ApiResponse({ status: 201, type: PayableResponseDto })
  async releaseWithoutInvoice(
    @CurrentActor() actor: RequestActor,
    @Body() dto: ReleasePayableWithoutInvoiceDto,
    @UploadedFile() proof: UploadedFileLike | undefined,
  ): Promise<PayableResponseDto> {
    const payable = await this.releasePayableWithoutInvoiceUseCase.execute(
      actor,
      dto,
      proof,
    );

    return PayableResponseDto.fromEntity(payable);
  }
}
