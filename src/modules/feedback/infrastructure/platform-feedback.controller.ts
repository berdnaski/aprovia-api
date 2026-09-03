import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from 'src/shared/decorators/current-user.decorator';
import { PaginatedResponseDto } from 'src/shared/dto/paginated-response.dto';
import { SuperAdminGuard } from 'src/shared/guards/super-admin.guard';
import { CountFeedbacksUseCase } from '../application/count-feedbacks.use-case';
import { GetFeedbackScreenshotUseCase } from '../application/get-feedback-screenshot.use-case';
import { ListFeedbacksUseCase } from '../application/list-feedbacks.use-case';
import { TriageFeedbackUseCase } from '../application/triage-feedback.use-case';
import {
  FeedbackCountersDto,
  FeedbackResponseDto,
} from '../dto/feedback-response.dto';
import { ListFeedbacksQueryDto } from '../dto/list-feedbacks-query.dto';
import { TriageFeedbackDto } from '../dto/triage-feedback.dto';

@ApiTags('Plataforma (SuperAdmin)')
@ApiCookieAuth('access_token')
@UseGuards(SuperAdminGuard)
@Controller('platform/feedbacks')
export class PlatformFeedbackController {
  constructor(
    private readonly listFeedbacksUseCase: ListFeedbacksUseCase,
    private readonly countFeedbacksUseCase: CountFeedbacksUseCase,
    private readonly triageFeedbackUseCase: TriageFeedbackUseCase,
    private readonly getFeedbackScreenshotUseCase: GetFeedbackScreenshotUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Listar feedbacks de todas as organizações' })
  @ApiResponse({ status: 200, type: [FeedbackResponseDto] })
  async list(
    @Query() query: ListFeedbacksQueryDto,
  ): Promise<PaginatedResponseDto<FeedbackResponseDto>> {
    const page = await this.listFeedbacksUseCase.execute(query);

    return PaginatedResponseDto.from(page, FeedbackResponseDto.from);
  }

  @Get('counters')
  @ApiOperation({
    summary: 'Contagens de feedback por status e por tipo',
    description: 'Opcionalmente restrito a uma organização.',
  })
  @ApiResponse({ status: 200, type: FeedbackCountersDto })
  async counters(
    @Query('companyId') companyId?: string,
  ): Promise<FeedbackCountersDto> {
    const counters = await this.countFeedbacksUseCase.execute(companyId);

    return FeedbackCountersDto.from(counters);
  }

  @Get(':id/screenshot')
  @ApiOperation({
    summary: 'URL assinada do print anexado ao feedback',
    description: 'A URL expira. O storageKey nunca é exposto.',
  })
  @ApiResponse({ status: 200 })
  async screenshot(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ url: string }> {
    const url = await this.getFeedbackScreenshotUseCase.execute(id);

    return { url };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Triar um feedback' })
  @ApiResponse({ status: 200, type: FeedbackResponseDto })
  async triage(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: TriageFeedbackDto,
  ): Promise<FeedbackResponseDto> {
    const feedback = await this.triageFeedbackUseCase.execute(id, userId, dto);

    return FeedbackResponseDto.from(feedback);
  }
}
