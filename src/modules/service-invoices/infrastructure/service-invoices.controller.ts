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
import type { Response } from 'express';
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
import { CurrentActor } from 'src/modules/purchase-requests/infrastructure/request-actor';
import { Roles } from 'src/shared/decorators/roles.decorator';
import { PaginatedResponseDto } from 'src/shared/dto/paginated-response.dto';
import { ValidationError } from 'src/shared/domain/errors/domain.error';
import { ApproveServiceInvoiceUseCase } from '../application/approve-service-invoice.use-case';
import { FindServiceInvoiceByIdUseCase } from '../application/find-service-invoice-by-id.use-case';
import { ListServiceInvoicesUseCase } from '../application/list-service-invoices.use-case';
import { RejectServiceInvoiceUseCase } from '../application/reject-service-invoice.use-case';
import { UploadServiceInvoiceUseCase } from '../application/upload-service-invoice.use-case';
import { ApproveServiceInvoiceDto } from '../dto/approve-service-invoice.dto';
import { ListServiceInvoicesQueryDto } from '../dto/list-service-invoices-query.dto';
import { RejectServiceInvoiceDto } from '../dto/reject-service-invoice.dto';
import { ServiceInvoiceResponseDto } from '../dto/service-invoice-response.dto';

interface UploadedFileLike {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
}

const MAX_UPLOAD_BYTES = Number(process.env.UPLOAD_MAX_SIZE_BYTES ?? 10485760);

@ApiTags('Notas de Serviço')
@ApiCookieAuth()
@Controller('service-invoices')
export class ServiceInvoicesController {
  constructor(
    private readonly listServiceInvoicesUseCase: ListServiceInvoicesUseCase,
    private readonly uploadServiceInvoiceUseCase: UploadServiceInvoiceUseCase,
    private readonly findServiceInvoiceByIdUseCase: FindServiceInvoiceByIdUseCase,
    private readonly rejectServiceInvoiceUseCase: RejectServiceInvoiceUseCase,
    private readonly approveServiceInvoiceUseCase: ApproveServiceInvoiceUseCase,
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
      properties: {
        file: { type: 'string', format: 'binary' },
        supplierId: { type: 'string', format: 'uuid' },
      },
    },
  })
  @ApiOperation({
    summary: 'Enviar o XML da NFS-e (nota fiscal de serviço)',
    description:
      'XML no padrão nacional (Sistema Nacional NFS-e / gov.br), não o PDF (DANFSE). Se souber o fornecedor, informe supplierId — senão vincula depois na aprovação.',
  })
  @ApiResponse({ status: 201, type: ServiceInvoiceResponseDto })
  @ApiResponse({ status: 409, description: 'Nota já cadastrada' })
  async upload(
    @CurrentActor() actor: RequestActor,
    @UploadedFile() file: UploadedFileLike | undefined,
    @Body('supplierId') supplierId?: string,
  ): Promise<ServiceInvoiceResponseDto> {
    if (!file) {
      throw new ValidationError('Nenhum arquivo enviado no campo "file"');
    }

    const serviceInvoice = await this.uploadServiceInvoiceUseCase.execute(
      actor,
      file.buffer.toString('utf-8'),
      supplierId ?? null,
    );

    return ServiceInvoiceResponseDto.fromEntity(serviceInvoice);
  }

  @Get()
  @Roles(CompanyMemberRole.FINANCE_ADMIN, CompanyMemberRole.ACCOUNTANT)
  @ApiOperation({
    summary: 'Listar as notas de serviço da empresa',
    description: 'Filtra por situação, fornecedor e número.',
  })
  @ApiResponse({ status: 200, type: PaginatedResponseDto })
  async list(
    @CurrentActor() actor: RequestActor,
    @Query() query: ListServiceInvoicesQueryDto,
  ): Promise<PaginatedResponseDto<ServiceInvoiceResponseDto>> {
    const page = await this.listServiceInvoicesUseCase.execute(
      actor.companyId,
      query,
    );

    return PaginatedResponseDto.from(page, ServiceInvoiceResponseDto.fromEntity);
  }

  @Get(':id')
  @Roles(CompanyMemberRole.FINANCE_ADMIN, CompanyMemberRole.ACCOUNTANT)
  @ApiOperation({
    summary: 'Detalhar uma nota de serviço com prestador, valores e retenções',
  })
  @ApiResponse({ status: 200, type: ServiceInvoiceResponseDto })
  async findById(
    @CurrentActor() actor: RequestActor,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ServiceInvoiceResponseDto> {
    const serviceInvoice = await this.findServiceInvoiceByIdUseCase.execute(
      id,
      actor.companyId,
    );

    return ServiceInvoiceResponseDto.fromEntity(serviceInvoice);
  }

  @Get(':id/xml')
  @Roles(CompanyMemberRole.FINANCE_ADMIN, CompanyMemberRole.ACCOUNTANT)
  @ApiOperation({
    summary: 'Baixar o XML original da nota de serviço',
    description:
      'Devolve o arquivo exatamente como o fornecedor enviou, para conciliação contábil e guarda fiscal.',
  })
  @ApiResponse({ status: 200, description: 'Arquivo XML' })
  async downloadXml(
    @CurrentActor() actor: RequestActor,
    @Param('id', ParseUUIDPipe) id: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const serviceInvoice = await this.findServiceInvoiceByIdUseCase.execute(
      id,
      actor.companyId,
    );

    response.set({
      'Content-Type': 'application/xml; charset=utf-8',
      'Content-Disposition': `attachment; filename="NFSe-${serviceInvoice.accessKey}.xml"`,
    });

    return new StreamableFile(Buffer.from(serviceInvoice.rawXml, 'utf-8'));
  }

  @Post(':id/approve')
  @Roles(CompanyMemberRole.FINANCE_ADMIN)
  @ApiOperation({
    summary: 'Aprovar a nota de serviço e gerar a conta a pagar',
    description:
      'Cria uma conta a pagar pelo valor líquido (após as retenções declaradas na nota). Informe o vencimento e, se quiser, o rateio por centro de custo.',
  })
  @ApiResponse({ status: 201, type: ServiceInvoiceResponseDto })
  async approve(
    @CurrentActor() actor: RequestActor,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApproveServiceInvoiceDto,
  ): Promise<ServiceInvoiceResponseDto> {
    const serviceInvoice = await this.approveServiceInvoiceUseCase.execute(
      id,
      actor,
      dto,
    );

    return ServiceInvoiceResponseDto.fromEntity(serviceInvoice);
  }

  @Post(':id/reject')
  @Roles(CompanyMemberRole.FINANCE_ADMIN)
  @ApiOperation({ summary: 'Rejeitar a nota de serviço' })
  @ApiResponse({ status: 201, type: ServiceInvoiceResponseDto })
  async reject(
    @CurrentActor() actor: RequestActor,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectServiceInvoiceDto,
  ): Promise<ServiceInvoiceResponseDto> {
    const serviceInvoice = await this.rejectServiceInvoiceUseCase.execute(
      id,
      actor,
      dto.reason,
    );

    return ServiceInvoiceResponseDto.fromEntity(serviceInvoice);
  }
}
