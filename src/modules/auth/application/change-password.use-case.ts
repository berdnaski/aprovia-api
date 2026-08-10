import { Injectable } from '@nestjs/common';
import { TokenType } from 'generated/prisma/enums';
import { FindUserByIdUseCase } from 'src/modules/users/application/find-user-by-id.use-case';
import { ValidatePasswordUseCase } from 'src/modules/users/application/validate-password.use-case';
import { IPasswordHasher } from 'src/shared/domain/password-hasher.interface';
import { AuthMailService } from 'src/shared/mail/application/auth-mail.service';
import { InvalidCredentialsError } from '../domain/auth.errors';
import { ChangePasswordDto } from '../dto/change-password.dto';
import { IssueTokenService } from './services/issue-token.service';

@Injectable()
export class ChangePasswordUseCase {
  constructor(
    private readonly findUserByIdUseCase: FindUserByIdUseCase,
    private readonly validatePasswordUseCase: ValidatePasswordUseCase,
    private readonly passwordHasher: IPasswordHasher,
    private readonly issueTokenService: IssueTokenService,
    private readonly authMailService: AuthMailService,
  ) {}

  async execute(userId: string, data: ChangePasswordDto): Promise<void> {
    const user = await this.findUserByIdUseCase.execute(userId);

    if (!user.passwordHash) {
      throw new InvalidCredentialsError();
    }

    const valid = await this.validatePasswordUseCase.execute(
      data.currentPassword,
      user.passwordHash,
    );

    if (!valid) {
      throw new InvalidCredentialsError();
    }

    const newPasswordHash = await this.passwordHasher.hash(data.newPassword);

    const token = await this.issueTokenService.execute({
      userId: user.id,
      type: TokenType.PASSWORD_CHANGE,
      referenceId: newPasswordHash,
      replaceExisting: true,
    });

    await this.issueTokenService.deliver(user.email, () =>
      this.authMailService.sendPasswordChangeConfirmation(
        user.email,
        user.name,
        token,
      ),
    );
  }
}
