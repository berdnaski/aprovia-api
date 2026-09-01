import type { Response } from 'express';
import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
  StreamableFile,
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
import { ValidationError } from 'src/shared/domain/errors/domain.error';
import { FindInvoiceByIdUseCase } from '../application/find-invoice-by-id.use-case';
import { LinkInvoiceToOrderUseCase } from '../application/link-invoice-to-order.use-case';
import { RejectInvoiceUseCase } from '../application/reject-invoice.use-case';
import { UploadInvoiceUseCase } from '../application/upload-invoice.use-case';
import { PaginatedResponseDto } from 'src/shared/dto/paginated-response.dto';
import { ListInvoicesQueryDto } from '../dto/list-invoices-query.dto';
import { ListInvoicesUseCase } from '../application/list-invoices.use-case';
import { InvoiceResponseDto } from '../dto/invoice-response.dto';
import { LinkInvoiceDto } from '../dto/link-invoice.dto';
import { RejectInvoiceDto } from '../dto/reject-invoice.dto';

interface UploadedFileLike {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
}

const MAX_UPLOAD_BYTES = Number(process.env.UPLOAD_MAX_SIZE_BYTES ?? 10485760);

@ApiTags('Notas Fiscais')
@ApiCookieAuth()
@Controller('invoices')
export class InvoicesController {
  constructor(
    private readonly listInvoicesUseCase: ListInvoicesUseCase,
    private readonly uploadInvoiceUseCase: UploadInvoiceUseCase,
    private readonly findInvoiceByIdUseCase: FindInvoiceByIdUseCase,
    private readonly linkInvoiceToOrderUseCase: LinkInvoiceToOrderUseCase,
    private readonly rejectInvoiceUseCase: RejectInvoiceUseCase,
  ) {}

  @Post('upload')
  @Roles(CompanyMemberRole.FINANCE_ADMIN)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
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
    summary:
      'Enviar o XML da nota fiscal sem ordem de compra conhecida (RN56, RN57)',
    description:
      'Use quando ainda não se sabe a qual ordem de compra a nota pertence. Ela entra sem vínculo — use POST /invoices/:id/link depois para associá-la. Prefira POST /purchase-orders/:id/invoices/upload quando já souber a ordem.',
  })
  @ApiResponse({ status: 201, type: InvoiceResponseDto })
  @ApiResponse({ status: 409, description: 'Nota já cadastrada' })
  async upload(
    @CurrentActor() actor: RequestActor,
    @UploadedFile() file: UploadedFileLike | undefined,
  ): Promise<InvoiceResponseDto> {
    if (!file) {
      throw new ValidationError('Nenhum arquivo enviado no campo "file"');
    }

    const invoice = await this.uploadInvoiceUseCase.execute(
      actor,
      file.buffer.toString('utf-8'),
    );

    return InvoiceResponseDto.fromEntity(invoice);
  }

  @Get()
  @Roles(CompanyMemberRole.FINANCE_ADMIN)
  @ApiOperation({
    summary: 'Listar as notas fiscais da empresa',
    description:
      'Filtra por situação, fornecedor, número, e por notas ainda sem ordem vinculada.',
  })
  @ApiResponse({ status: 200, type: PaginatedResponseDto })
  async list(
    @CurrentActor() actor: RequestActor,
    @Query() query: ListInvoicesQueryDto,
  ): Promise<PaginatedResponseDto<InvoiceResponseDto>> {
    const page = await this.listInvoicesUseCase.executeForCompany(
      actor.companyId,
      query,
    );

    return PaginatedResponseDto.from(page, InvoiceResponseDto.fromEntity);
  }

  @Get(':id')
  @Roles(...ALL_ROLES)
  @ApiOperation({ summary: 'Detalhar uma nota fiscal com itens e impostos' })
  @ApiResponse({ status: 200, type: InvoiceResponseDto })
  async findById(
    @CurrentActor() actor: RequestActor,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<InvoiceResponseDto> {
    const invoice = await this.findInvoiceByIdUseCase.execute(
      id,
      actor.companyId,
    );

    return InvoiceResponseDto.fromEntity(invoice);
  }

  @Get(':id/xml')
  @Roles(...ALL_ROLES)
  @ApiOperation({
    summary: 'Baixar o XML original da nota fiscal',
    description:
      'Devolve o arquivo exatamente como o fornecedor enviou, para conciliação contábil e guarda fiscal.',
  })
  @ApiResponse({ status: 200, description: 'Arquivo XML' })
  async downloadXml(
    @CurrentActor() actor: RequestActor,
    @Param('id', ParseUUIDPipe) id: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const invoice = await this.findInvoiceByIdUseCase.execute(
      id,
      actor.companyId,
    );

    response.set({
      'Content-Type': 'application/xml; charset=utf-8',
      'Content-Disposition': `attachment; filename="NFe-${invoice.accessKey}.xml"`,
    });

    return new StreamableFile(Buffer.from(invoice.rawXml, 'utf-8'));
  }

  @Post(':id/link')
  @Roles(CompanyMemberRole.FINANCE_ADMIN)
  @ApiOperation({
    summary: 'Vincular manualmente a uma ordem de compra',
    description:
      'Use quando o vínculo automático por CNPJ do fornecedor não encontrou a ordem certa.',
  })
  @ApiResponse({ status: 201, type: InvoiceResponseDto })
  async link(
    @CurrentActor() actor: RequestActor,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: LinkInvoiceDto,
  ): Promise<InvoiceResponseDto> {
    const invoice = await this.linkInvoiceToOrderUseCase.execute(
      id,
      dto.purchaseOrderId,
      actor,
    );

    return InvoiceResponseDto.fromEntity(invoice);
  }

  @Post(':id/reject')
  @Roles(CompanyMemberRole.FINANCE_ADMIN)
  @ApiOperation({ summary: 'Rejeitar a nota fiscal' })
  @ApiResponse({ status: 201, type: InvoiceResponseDto })
  async reject(
    @CurrentActor() actor: RequestActor,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectInvoiceDto,
  ): Promise<InvoiceResponseDto> {
    const invoice = await this.rejectInvoiceUseCase.execute(
      id,
      actor,
      dto.reason,
    );

    return InvoiceResponseDto.fromEntity(invoice);
  }
}

@ApiTags('Notas Fiscais')
@ApiCookieAuth()
@Controller('purchase-orders/:id/invoices')
export class OrderInvoicesController {
  constructor(
    private readonly listInvoicesUseCase: ListInvoicesUseCase,
    private readonly uploadInvoiceUseCase: UploadInvoiceUseCase,
  ) {}

  @Post('upload')
  @Roles(CompanyMemberRole.FINANCE_ADMIN)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
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
    summary: 'Enviar o XML da nota fiscal desta ordem de compra (RN56, RN57)',
    description:
      'Caminho principal: a nota já entra vinculada a esta ordem. O XML original da NFe, não o PDF (DANFE). Nota duplicada (mesma chave de acesso) e nota emitida contra outro CNPJ são rejeitadas.',
  })
  @ApiResponse({ status: 201, type: InvoiceResponseDto })
  @ApiResponse({ status: 409, description: 'Nota já cadastrada' })
  async upload(
    @CurrentActor() actor: RequestActor,
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: UploadedFileLike | undefined,
  ): Promise<InvoiceResponseDto> {
    if (!file) {
      throw new ValidationError('Nenhum arquivo enviado no campo "file"');
    }

    const invoice = await this.uploadInvoiceUseCase.execute(
      actor,
      file.buffer.toString('utf-8'),
      id,
    );

    return InvoiceResponseDto.fromEntity(invoice);
  }

  @Get()
  @Roles(...ALL_ROLES)
  @ApiOperation({ summary: 'Listar as notas vinculadas a uma ordem de compra' })
  @ApiResponse({ status: 200, type: PaginatedResponseDto })
  async list(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<InvoiceResponseDto[]> {
    const invoices = await this.listInvoicesUseCase.execute(id);

    return invoices.map(InvoiceResponseDto.fromEntity);
  }
}
