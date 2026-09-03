import {
  Body,
  Controller,
  Get,
  Headers,
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
import { CurrentCompany } from 'src/shared/decorators/current-company.decorator';
import { CurrentUser } from 'src/shared/decorators/current-user.decorator';
import { Roles } from 'src/shared/decorators/roles.decorator';
import { PaginatedResponseDto } from 'src/shared/dto/paginated-response.dto';
import { ListFeedbacksUseCase } from '../application/list-feedbacks.use-case';
import { SubmitFeedbackUseCase } from '../application/submit-feedback.use-case';
import { CreateFeedbackDto } from '../dto/create-feedback.dto';
import {
  FeedbackResponseDto,
  MyFeedbackResponseDto,
} from '../dto/feedback-response.dto';
import { ListFeedbacksQueryDto } from '../dto/list-feedbacks-query.dto';

const MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024;

interface UploadedScreenshot {
  mimetype: string;
  buffer: Buffer;
}

const ANY_ROLE = [
  CompanyMemberRole.REQUESTER,
  CompanyMemberRole.APPROVER,
  CompanyMemberRole.FINANCE_ADMIN,
] as const;

@ApiTags('Feedback')
@ApiCookieAuth('access_token')
@Controller('feedbacks')
export class FeedbackController {
  constructor(
    private readonly submitFeedbackUseCase: SubmitFeedbackUseCase,
    private readonly listFeedbacksUseCase: ListFeedbacksUseCase,
  ) {}

  @Post()
  @Roles(...ANY_ROLE)
  @UseInterceptors(
    FileInterceptor('screenshot', {
      limits: { fileSize: MAX_SCREENSHOT_BYTES, files: 1 },
    }),
  )
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        kind: { type: 'string' },
        message: { type: 'string' },
        route: { type: 'string' },
        screenshot: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiOperation({
    summary: 'Enviar feedback sobre o produto',
    description:
      'A rota e o navegador são capturados junto para dar contexto na triagem.',
  })
  @ApiResponse({ status: 201, type: FeedbackResponseDto })
  async submit(
    @CurrentCompany() companyId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateFeedbackDto,
    @Headers('user-agent') userAgent?: string,
    @UploadedFile() screenshot?: UploadedScreenshot,
  ): Promise<FeedbackResponseDto> {
    const feedback = await this.submitFeedbackUseCase.execute(
      companyId,
      userId,
      dto,
      userAgent,
      screenshot
        ? {
            buffer: screenshot.buffer,
            declaredMimeType: screenshot.mimetype,
          }
        : undefined,
    );

    return FeedbackResponseDto.from(feedback);
  }

  @Get('mine')
  @Roles(...ANY_ROLE)
  @ApiOperation({
    summary: 'Listar os feedbacks que eu enviei',
    description: 'Fecha o ciclo: quem enviou consegue ver que foi lido.',
  })
  @ApiResponse({ status: 200, type: [MyFeedbackResponseDto] })
  async mine(
    @CurrentCompany() companyId: string,
    @CurrentUser('userId') userId: string,
    @Query() query: ListFeedbacksQueryDto,
  ): Promise<PaginatedResponseDto<MyFeedbackResponseDto>> {
    const page = await this.listFeedbacksUseCase.execute(query, {
      companyId,
      authorId: userId,
    });

    return PaginatedResponseDto.from(page, MyFeedbackResponseDto.from);
  }
}
