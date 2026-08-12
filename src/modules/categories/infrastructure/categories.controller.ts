import {
  Body,
  Controller,
  Get,
  Param,
  ParseBoolPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CompanyMemberRole } from 'generated/prisma/enums';
import { CurrentCompany } from 'src/shared/decorators/current-company.decorator';
import { Roles } from 'src/shared/decorators/roles.decorator';
import { CreateCategoryUseCase } from '../application/create-category.use-case';
import { FindCategoryByIdUseCase } from '../application/find-category-by-id.use-case';
import { ListCategoriesUseCase } from '../application/list-categories.use-case';
import { SetCategoryActiveUseCase } from '../application/set-category-active.use-case';
import { UpdateCategoryUseCase } from '../application/update-category.use-case';
import { CategoryResponseDto } from '../dto/category-response.dto';
import { CreateCategoryDto } from '../dto/create-category.dto';
import { SetCategoryActiveDto } from '../dto/set-category-active.dto';
import { UpdateCategoryDto } from '../dto/update-category.dto';

@ApiTags('Categorias de Compra')
@ApiCookieAuth('access_token')
@Controller('categories')
export class CategoriesController {
  constructor(
    private readonly createCategoryUseCase: CreateCategoryUseCase,
    private readonly listCategoriesUseCase: ListCategoriesUseCase,
    private readonly findCategoryByIdUseCase: FindCategoryByIdUseCase,
    private readonly updateCategoryUseCase: UpdateCategoryUseCase,
    private readonly setCategoryActiveUseCase: SetCategoryActiveUseCase,
  ) {}

  @Get()
  @Roles(
    CompanyMemberRole.REQUESTER,
    CompanyMemberRole.APPROVER,
    CompanyMemberRole.FINANCE_ADMIN,
  )
  @ApiOperation({
    summary: 'Listar categorias de compra',
    description:
      'Por padrão devolve apenas as ativas, que é o que alimenta o seletor do pedido.',
  })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
  @ApiResponse({ status: 200, type: [CategoryResponseDto] })
  async list(
    @CurrentCompany() companyId: string,
    @Query('includeInactive', new ParseBoolPipe({ optional: true }))
    includeInactive?: boolean,
  ): Promise<CategoryResponseDto[]> {
    const categories = await this.listCategoriesUseCase.execute(companyId, {
      includeInactive,
    });
    return CategoryResponseDto.fromEntities(categories);
  }

  @Get(':id')
  @Roles(
    CompanyMemberRole.REQUESTER,
    CompanyMemberRole.APPROVER,
    CompanyMemberRole.FINANCE_ADMIN,
  )
  @ApiOperation({ summary: 'Buscar categoria por ID' })
  @ApiResponse({ status: 200, type: CategoryResponseDto })
  @ApiResponse({ status: 404, description: 'Categoria não encontrada' })
  async findById(
    @CurrentCompany() companyId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CategoryResponseDto> {
    const category = await this.findCategoryByIdUseCase.execute(id, companyId);
    return CategoryResponseDto.fromEntity(category);
  }

  @Post()
  @Roles(CompanyMemberRole.FINANCE_ADMIN)
  @ApiOperation({ summary: 'Criar categoria de compra' })
  @ApiResponse({ status: 201, type: CategoryResponseDto })
  @ApiResponse({ status: 409, description: 'Nome já usado na empresa' })
  async create(
    @CurrentCompany() companyId: string,
    @Body() dto: CreateCategoryDto,
  ): Promise<CategoryResponseDto> {
    const category = await this.createCategoryUseCase.execute(companyId, dto);
    return CategoryResponseDto.fromEntity(category);
  }

  @Patch(':id')
  @Roles(CompanyMemberRole.FINANCE_ADMIN)
  @ApiOperation({ summary: 'Editar categoria de compra' })
  @ApiResponse({ status: 200, type: CategoryResponseDto })
  @ApiResponse({ status: 409, description: 'Nome já usado na empresa' })
  async update(
    @CurrentCompany() companyId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCategoryDto,
  ): Promise<CategoryResponseDto> {
    const category = await this.updateCategoryUseCase.execute(
      id,
      companyId,
      dto,
    );
    return CategoryResponseDto.fromEntity(category);
  }

  @Patch(':id/active')
  @Roles(CompanyMemberRole.FINANCE_ADMIN)
  @ApiOperation({
    summary: 'Ativar ou inativar categoria',
    description:
      'Categorias nunca são excluídas: pedidos antigos referenciam a categoria e o histórico precisa ser preservado.',
  })
  @ApiResponse({ status: 200, type: CategoryResponseDto })
  async setActive(
    @CurrentCompany() companyId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetCategoryActiveDto,
  ): Promise<CategoryResponseDto> {
    const category = await this.setCategoryActiveUseCase.execute(
      id,
      companyId,
      dto.active,
    );
    return CategoryResponseDto.fromEntity(category);
  }
}
