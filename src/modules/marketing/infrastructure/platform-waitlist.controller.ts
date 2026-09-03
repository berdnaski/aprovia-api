import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PaginatedResponseDto } from 'src/shared/dto/paginated-response.dto';
import { SuperAdminGuard } from 'src/shared/guards/super-admin.guard';
import { ListWaitlistUseCase } from '../application/list-waitlist.use-case';
import { ListWaitlistQueryDto } from '../dto/list-waitlist-query.dto';
import { WaitlistEntryResponseDto } from '../dto/waitlist-response.dto';

@ApiTags('Plataforma (SuperAdmin)')
@ApiCookieAuth('access_token')
@UseGuards(SuperAdminGuard)
@Controller('platform/waitlist')
export class PlatformWaitlistController {
  constructor(private readonly listWaitlistUseCase: ListWaitlistUseCase) {}

  @Get()
  @ApiOperation({ summary: 'Quem entrou na lista de espera' })
  @ApiResponse({ status: 200, type: [WaitlistEntryResponseDto] })
  async list(
    @Query() query: ListWaitlistQueryDto,
  ): Promise<PaginatedResponseDto<WaitlistEntryResponseDto>> {
    const page = await this.listWaitlistUseCase.execute(query);

    return PaginatedResponseDto.from(page, WaitlistEntryResponseDto.from);
  }
}
