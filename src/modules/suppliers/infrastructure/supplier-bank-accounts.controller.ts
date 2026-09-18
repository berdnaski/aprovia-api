import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CompanyMemberRole } from 'generated/prisma/enums';
import { CurrentCompany } from 'src/shared/decorators/current-company.decorator';
import { CurrentMember } from 'src/shared/decorators/current-member.decorator';
import { CurrentUser } from 'src/shared/decorators/current-user.decorator';
import { Roles } from 'src/shared/decorators/roles.decorator';
import { ArchiveBankAccountUseCase } from '../application/archive-bank-account.use-case';
import { ListBankAccountsUseCase } from '../application/list-bank-accounts.use-case';
import { RequestBankAccountUseCase } from '../application/request-bank-account.use-case';
import { ReviewBankAccountUseCase } from '../application/review-bank-account.use-case';
import { RequestBankAccountDto } from '../dto/request-bank-account.dto';
import { ReviewBankAccountDto } from '../dto/review-bank-account.dto';
import { SupplierBankAccountResponseDto } from '../dto/supplier-bank-account-response.dto';

const REVIEW_ROLES = [
  CompanyMemberRole.APPROVER,
  CompanyMemberRole.FINANCE_ADMIN,
] as const;

@ApiTags('Fornecedores')
@ApiCookieAuth('access_token')
@Controller('suppliers/:supplierId/bank-accounts')
export class SupplierBankAccountsController {
  constructor(
    private readonly requestBankAccountUseCase: RequestBankAccountUseCase,
    private readonly reviewBankAccountUseCase: ReviewBankAccountUseCase,
    private readonly archiveBankAccountUseCase: ArchiveBankAccountUseCase,
    private readonly listBankAccountsUseCase: ListBankAccountsUseCase,
  ) {}

  @Get()
  @Roles(...REVIEW_ROLES)
  @ApiOperation({ summary: 'Listar contas bancárias do fornecedor' })
  @ApiResponse({ status: 200, type: [SupplierBankAccountResponseDto] })
  async list(
    @CurrentCompany() companyId: string,
    @Param('supplierId', ParseUUIDPipe) supplierId: string,
  ): Promise<SupplierBankAccountResponseDto[]> {
    const accounts = await this.listBankAccountsUseCase.execute(
      supplierId,
      companyId,
    );
    return SupplierBankAccountResponseDto.fromEntities(accounts);
  }

  @Post()
  @Roles(CompanyMemberRole.FINANCE_ADMIN)
  @ApiOperation({
    summary: 'Cadastrar conta bancária do fornecedor',
    description:
      'Entra como PENDING e precisa de aprovação de um segundo Admin Financeiro ou Aprovador antes de ser usada em pagamentos.',
  })
  @ApiResponse({ status: 201, type: SupplierBankAccountResponseDto })
  async request(
    @CurrentCompany() companyId: string,
    @CurrentMember() memberId: string,
    @CurrentUser('userId') userId: string,
    @Param('supplierId', ParseUUIDPipe) supplierId: string,
    @Body() dto: RequestBankAccountDto,
  ): Promise<SupplierBankAccountResponseDto> {
    const account = await this.requestBankAccountUseCase.execute(
      supplierId,
      { memberId, companyId, userId },
      dto,
    );
    return SupplierBankAccountResponseDto.fromEntity(account);
  }

  @Post(':id/approve')
  @Roles(...REVIEW_ROLES)
  @ApiOperation({
    summary: 'Aprovar conta bancária',
    description: 'Quem cadastrou não pode aprovar a própria conta.',
  })
  @ApiResponse({ status: 201, type: SupplierBankAccountResponseDto })
  async approve(
    @CurrentCompany() companyId: string,
    @CurrentMember() memberId: string,
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReviewBankAccountDto,
  ): Promise<SupplierBankAccountResponseDto> {
    const account = await this.reviewBankAccountUseCase.execute(
      id,
      { memberId, companyId, userId },
      true,
      dto.note ?? null,
    );
    return SupplierBankAccountResponseDto.fromEntity(account);
  }

  @Post(':id/reject')
  @Roles(...REVIEW_ROLES)
  @ApiOperation({ summary: 'Recusar conta bancária' })
  @ApiResponse({ status: 201, type: SupplierBankAccountResponseDto })
  async reject(
    @CurrentCompany() companyId: string,
    @CurrentMember() memberId: string,
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReviewBankAccountDto,
  ): Promise<SupplierBankAccountResponseDto> {
    const account = await this.reviewBankAccountUseCase.execute(
      id,
      { memberId, companyId, userId },
      false,
      dto.note ?? null,
    );
    return SupplierBankAccountResponseDto.fromEntity(account);
  }

  @Post(':id/archive')
  @Roles(CompanyMemberRole.FINANCE_ADMIN)
  @ApiOperation({ summary: 'Arquivar conta bancária' })
  @ApiResponse({ status: 201, type: SupplierBankAccountResponseDto })
  async archive(
    @CurrentCompany() companyId: string,
    @CurrentMember() memberId: string,
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<SupplierBankAccountResponseDto> {
    const account = await this.archiveBankAccountUseCase.execute(id, {
      memberId,
      companyId,
      userId,
    });
    return SupplierBankAccountResponseDto.fromEntity(account);
  }
}
