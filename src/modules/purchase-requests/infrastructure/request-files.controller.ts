import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { EnvSchema } from 'src/shared/config/env.schema';
import { ValidationError } from 'src/shared/domain/errors/domain.error';
import { Roles } from 'src/shared/decorators/roles.decorator';
import { RequestActor } from '../application/find-request-by-id.use-case';
import { GetExtractionResultUseCase } from '../application/get-extraction-result.use-case';
import { ManageRequestFilesUseCase } from '../application/manage-request-files.use-case';
import { RequestExtractionUseCase } from '../application/request-extraction.use-case';
import {
  DownloadUrlResponseDto,
  ExtractionResponseDto,
  RequestFileResponseDto,
} from '../dto/purchase-request-response.dto';
import { RequestExtractionDto } from '../dto/request-extraction.dto';
import { ALL_ROLES, CurrentActor } from './request-actor';

interface UploadedFileLike {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
}

const MAX_UPLOAD_BYTES = Number(process.env.UPLOAD_MAX_SIZE_BYTES ?? 10485760);

@ApiTags('Pedidos de Compra')
@ApiCookieAuth('access_token')
@Controller('purchase-requests/:id')
export class RequestFilesController {
  constructor(
    private readonly manageRequestFilesUseCase: ManageRequestFilesUseCase,
    private readonly requestExtractionUseCase: RequestExtractionUseCase,
    private readonly getExtractionResultUseCase: GetExtractionResultUseCase,
    private readonly configService: ConfigService<EnvSchema, true>,
  ) {}

  @Post('files')
  @Roles(...ALL_ROLES)
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
    summary: 'Anexar documento ao pedido (RF47)',
    description:
      'O tipo é detectado pela assinatura do arquivo, não pela extensão. Extensão trocada é rejeitada.',
  })
  @ApiResponse({ status: 201, type: RequestFileResponseDto })
  async upload(
    @CurrentActor() actor: RequestActor,
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: UploadedFileLike | undefined,
  ): Promise<RequestFileResponseDto> {
    if (!file) {
      throw new ValidationError('Nenhum arquivo enviado no campo "file"');
    }

    const created = await this.manageRequestFilesUseCase.upload(id, actor, {
      fileName: file.originalname,
      declaredMimeType: file.mimetype,
      buffer: file.buffer,
    });

    return RequestFileResponseDto.fromEntity(created);
  }

  @Get('files')
  @Roles(...ALL_ROLES)
  @ApiOperation({ summary: 'Listar anexos do pedido' })
  @ApiResponse({ status: 200, type: [RequestFileResponseDto] })
  async list(
    @CurrentActor() actor: RequestActor,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<RequestFileResponseDto[]> {
    const files = await this.manageRequestFilesUseCase.list(id, actor);
    return RequestFileResponseDto.fromEntities(files);
  }

  @Get('files/:fileId/download')
  @Roles(...ALL_ROLES)
  @ApiOperation({
    summary: 'Obter URL assinada de download',
    description:
      'A URL expira. O storageKey nunca é exposto: o bucket pode mudar sem quebrar o cliente.',
  })
  @ApiResponse({ status: 200, type: DownloadUrlResponseDto })
  async download(
    @CurrentActor() actor: RequestActor,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('fileId', ParseUUIDPipe) fileId: string,
  ): Promise<DownloadUrlResponseDto> {
    const url = await this.manageRequestFilesUseCase.getDownloadUrl(
      id,
      fileId,
      actor,
    );

    return {
      url,
      expiresInSeconds:
        this.configService.get('R2_SIGNED_URL_TTL_SECONDS', { infer: true }) ??
        900,
    };
  }

  @Delete('files/:fileId')
  @Roles(...ALL_ROLES)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover anexo' })
  @ApiResponse({ status: 204, description: 'Anexo removido' })
  async remove(
    @CurrentActor() actor: RequestActor,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('fileId', ParseUUIDPipe) fileId: string,
  ): Promise<void> {
    await this.manageRequestFilesUseCase.remove(id, fileId, actor);
  }

  @Post('extract')
  @Roles(...ALL_ROLES)
  @ApiOperation({
    summary: 'Solicitar extração assistida por IA (RF48)',
    description:
      'Assíncrona e isolada (RNF13): devolve QUEUED na hora. Se a fila ou o provedor estiverem fora, devolve FAILED com motivo e o formulário manual segue funcionando. Nenhum campo é gravado sem confirmação do solicitante (RN42).',
  })
  @ApiResponse({ status: 201, type: ExtractionResponseDto })
  async extract(
    @CurrentActor() actor: RequestActor,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RequestExtractionDto,
  ): Promise<ExtractionResponseDto> {
    const result = await this.requestExtractionUseCase.execute(id, actor, dto);
    return ExtractionResponseDto.fromResult(result);
  }

  @Get('extract')
  @Roles(...ALL_ROLES)
  @ApiOperation({
    summary: 'Consultar o resultado da última extração',
    description:
      'Devolve QUEUED enquanto o job não terminou. As sugestões são para conferência: nada é gravado no pedido sem o solicitante confirmar (RN42).',
  })
  @ApiResponse({ status: 200, type: ExtractionResponseDto })
  @ApiResponse({ status: 204, description: 'Nenhuma extração solicitada' })
  async extractionResult(
    @CurrentActor() actor: RequestActor,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ExtractionResponseDto | null> {
    const result = await this.getExtractionResultUseCase.execute(id, actor);
    return result ? ExtractionResponseDto.fromResult(result) : null;
  }
}
