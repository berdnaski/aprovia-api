import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CompanyMemberRole } from 'generated/prisma/enums';
import { CurrentCompany } from 'src/shared/decorators/current-company.decorator';
import { Roles } from 'src/shared/decorators/roles.decorator';
import { PaginatedResponseDto } from 'src/shared/dto/paginated-response.dto';
import { CreateSupplierUseCase } from '../application/create-supplier.use-case';
import { FindSupplierByIdUseCase } from '../application/find-supplier-by-id.use-case';
import { ListSuppliersUseCase } from '../application/list-suppliers.use-case';
import { LookupCnpjUseCase } from '../application/lookup-cnpj.use-case';
import { RevalidateSupplierUseCase } from '../application/revalidate-supplier.use-case';
import { SetSupplierBlockedUseCase } from '../application/set-supplier-blocked.use-case';
import { UpdateSupplierUseCase } from '../application/update-supplier.use-case';
import { evaluateSupplier } from '../domain/services/supplier-eligibility.service';
import { SupplierEntity } from '../domain/supplier.entity';
import { CnpjLookupResponseDto } from '../dto/cnpj-lookup-response.dto';
import { CreateSupplierDto } from '../dto/create-supplier.dto';
import { ListSuppliersQueryDto } from '../dto/list-suppliers-query.dto';
import { SetSupplierBlockedDto } from '../dto/set-supplier-blocked.dto';
import { SupplierResponseDto } from '../dto/supplier-response.dto';
import { UpdateSupplierDto } from '../dto/update-supplier.dto';

@ApiTags('Fornecedores')
@ApiCookieAuth('access_token')
@Controller('suppliers')
export class SuppliersController {
  constructor(
    private readonly createSupplierUseCase: CreateSupplierUseCase,
    private readonly listSuppliersUseCase: ListSuppliersUseCase,
    private readonly findSupplierByIdUseCase: FindSupplierByIdUseCase,
    private readonly updateSupplierUseCase: UpdateSupplierUseCase,
    private readonly setSupplierBlockedUseCase: SetSupplierBlockedUseCase,
    private readonly revalidateSupplierUseCase: RevalidateSupplierUseCase,
    private readonly lookupCnpjUseCase: LookupCnpjUseCase,
  ) {}

  private toDto(supplier: SupplierEntity): SupplierResponseDto {
    return SupplierResponseDto.fromEntity(supplier, evaluateSupplier(supplier));
  }

  @Get('lookup/:cnpj')
  @Roles(
    CompanyMemberRole.REQUESTER,
    CompanyMemberRole.APPROVER,
    CompanyMemberRole.FINANCE_ADMIN,
  )
  @ApiOperation({
    summary: 'Consultar CNPJ para auto-completar o cadastro',
    description:
      'Se o fornecedor já existe na base da empresa, devolve o registro sem consultar a API (RF40). Falha ou timeout na consulta devolve found=false, e o cadastro segue permitido manualmente (RNF14).',
  })
  @ApiResponse({ status: 200, type: CnpjLookupResponseDto })
  @ApiResponse({ status: 400, description: 'CNPJ inválido' })
  async lookup(
    @CurrentCompany() companyId: string,
    @Param('cnpj') cnpj: string,
  ): Promise<CnpjLookupResponseDto> {
    const view = await this.lookupCnpjUseCase.execute(companyId, cnpj);
    return CnpjLookupResponseDto.fromView(view);
  }

  @Post()
  @Roles(
    CompanyMemberRole.REQUESTER,
    CompanyMemberRole.APPROVER,
    CompanyMemberRole.FINANCE_ADMIN,
  )
  @ApiOperation({
    summary: 'Cadastrar fornecedor',
    description:
      'Consulta o CNPJ na Receita Federal. Com sucesso, os dados da API prevalecem e o fornecedor nasce VALIDATED. Com falha, usa o que veio no corpo e nasce UNKNOWN/FAILED, sem impedir o cadastro (RNF14).',
  })
  @ApiResponse({ status: 201, type: SupplierResponseDto })
  @ApiResponse({ status: 400, description: 'CNPJ inválido' })
  @ApiResponse({ status: 409, description: 'CNPJ já cadastrado na empresa' })
  async create(
    @CurrentCompany() companyId: string,
    @Body() dto: CreateSupplierDto,
  ): Promise<SupplierResponseDto> {
    return this.toDto(await this.createSupplierUseCase.execute(companyId, dto));
  }

  @Get()
  @Roles(
    CompanyMemberRole.REQUESTER,
    CompanyMemberRole.APPROVER,
    CompanyMemberRole.FINANCE_ADMIN,
  )
  @ApiOperation({ summary: 'Listar fornecedores da base' })
  @ApiResponse({ status: 200, type: PaginatedResponseDto })
  async list(
    @CurrentCompany() companyId: string,
    @Query() query: ListSuppliersQueryDto,
  ): Promise<PaginatedResponseDto<SupplierResponseDto>> {
    const page = await this.listSuppliersUseCase.execute(companyId, query);
    return PaginatedResponseDto.from(page, (supplier) => this.toDto(supplier));
  }

  @Get(':id')
  @Roles(
    CompanyMemberRole.REQUESTER,
    CompanyMemberRole.APPROVER,
    CompanyMemberRole.FINANCE_ADMIN,
  )
  @ApiOperation({ summary: 'Buscar fornecedor por ID' })
  @ApiResponse({ status: 200, type: SupplierResponseDto })
  @ApiResponse({ status: 404, description: 'Fornecedor não encontrado' })
  async findById(
    @CurrentCompany() companyId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<SupplierResponseDto> {
    return this.toDto(
      await this.findSupplierByIdUseCase.execute(id, companyId),
    );
  }

  @Patch(':id')
  @Roles(CompanyMemberRole.FINANCE_ADMIN)
  @ApiOperation({
    summary: 'Editar fornecedor',
    description:
      'Edita apenas dados cadastrais. Situação na Receita e status de validação só mudam pela revalidação.',
  })
  @ApiResponse({ status: 200, type: SupplierResponseDto })
  async update(
    @CurrentCompany() companyId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSupplierDto,
  ): Promise<SupplierResponseDto> {
    return this.toDto(
      await this.updateSupplierUseCase.execute(id, companyId, dto),
    );
  }

  @Patch(':id/blocked')
  @Roles(CompanyMemberRole.FINANCE_ADMIN)
  @ApiOperation({
    summary: 'Bloquear ou liberar fornecedor',
    description:
      'Decisão comercial da organização, independente da situação na Receita Federal (RF41). Bloqueado impede a submissão de novos pedidos.',
  })
  @ApiResponse({ status: 200, type: SupplierResponseDto })
  async setBlocked(
    @CurrentCompany() companyId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetSupplierBlockedDto,
  ): Promise<SupplierResponseDto> {
    return this.toDto(
      await this.setSupplierBlockedUseCase.execute(id, companyId, dto.blocked),
    );
  }

  @Post(':id/revalidate')
  @Roles(CompanyMemberRole.FINANCE_ADMIN)
  @ApiOperation({
    summary: 'Revalidar o CNPJ na Receita Federal',
    description:
      'Reconsulta e atualiza situação cadastral e validatedAt (RF41/RF42). Falha na consulta marca FAILED sem apagar os dados já conhecidos.',
  })
  @ApiResponse({ status: 201, type: SupplierResponseDto })
  async revalidate(
    @CurrentCompany() companyId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<SupplierResponseDto> {
    return this.toDto(
      await this.revalidateSupplierUseCase.execute(id, companyId),
    );
  }
}
