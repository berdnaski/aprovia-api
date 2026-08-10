import { Injectable } from '@nestjs/common';
import { TokenType } from 'generated/prisma/enums';
import { CreateUserUseCase } from 'src/modules/users/application/create-user.use-case';
import { UserEntity } from 'src/modules/users/domain/user.entity';
import { AuthMailService } from 'src/shared/mail/application/auth-mail.service';
import { RegisterDto } from '../dto/register.dto';
import { IssueTokenService } from './services/issue-token.service';

@Injectable()
export class RegisterUseCase {
  constructor(
    private readonly createUserUseCase: CreateUserUseCase,
    private readonly issueTokenService: IssueTokenService,
    private readonly authMailService: AuthMailService,
  ) {}

  async execute(data: RegisterDto): Promise<UserEntity> {
    const user = await this.createUserUseCase.execute({
      name: data.name,
      email: data.email,
      password: data.password,
      phone: data.phone,
      termsAccepted: data.termsAccepted,
    });

    const token = await this.issueTokenService.execute({
      userId: user.id,
      type: TokenType.EMAIL_VERIFICATION,
    });

    await this.issueTokenService.deliver(user.email, () =>
      this.authMailService.sendEmailVerification(user.email, user.name, token),
    );

    return user;
  }
}
