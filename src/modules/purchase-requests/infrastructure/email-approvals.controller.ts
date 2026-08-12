import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { IsPublic } from 'src/shared/decorators/is-public.decorator';
import { DecideByEmailUseCase } from '../application/decide-by-email.use-case';
import { GetEmailApprovalUseCase } from '../application/get-email-approval.use-case';
import { DecideByEmailDto } from '../dto/decide-by-email.dto';
import { EmailApprovalResponseDto } from '../dto/email-approval-response.dto';

@ApiTags('Aprovação por e-mail')
@Controller('email-approvals')
export class EmailApprovalsController {
  constructor(
    private readonly getEmailApprovalUseCase: GetEmailApprovalUseCase,
    private readonly decideByEmailUseCase: DecideByEmailUseCase,
  ) {}

  @Get(':token')
  @IsPublic()
  @ApiOperation({
    summary: 'Abrir a página de decisão do e-mail (RF65)',
    description:
      'Não consome o token e não altera nada — varredores de link de e-mail abrem tudo que chega. Pedido já decidido responde 200 com o estado atual.',
  })
  @ApiResponse({ status: 200, type: EmailApprovalResponseDto })
  @ApiResponse({ status: 404, description: 'Link inválido ou expirado' })
  async show(@Param('token') token: string): Promise<EmailApprovalResponseDto> {
    const { view } = await this.getEmailApprovalUseCase.execute(token);

    return EmailApprovalResponseDto.fromView(view);
  }

  @Post(':token')
  @IsPublic()
  @ApiOperation({
    summary: 'Decidir sem entrar na plataforma (RF65)',
    description:
      'O link vale uma única decisão (RN28). A rejeição exige justificativa (RN44).',
  })
  @ApiResponse({ status: 201, type: EmailApprovalResponseDto })
  @ApiResponse({ status: 409, description: 'Link já usado ou pedido decidido' })
  async decide(
    @Param('token') token: string,
    @Body() dto: DecideByEmailDto,
  ): Promise<EmailApprovalResponseDto> {
    const view = await this.decideByEmailUseCase.execute(token, dto);

    return EmailApprovalResponseDto.fromView(view);
  }
}
