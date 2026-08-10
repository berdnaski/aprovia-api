import { Injectable } from '@nestjs/common';
import { FindUserByEmailUseCase } from 'src/modules/users/application/find-user-by-email.use-case';
import { ValidatePasswordUseCase } from 'src/modules/users/application/validate-password.use-case';
import { UserEntity } from 'src/modules/users/domain/user.entity';
import { AuthTokenEntity } from '../domain/auth-token.entity';
import {
  AccountDisabledError,
  InvalidCredentialsError,
} from '../domain/auth.errors';
import { MembershipEntity } from '../domain/membership.entity';
import { IMembershipsRepository } from '../domain/memberships.repository.interface';
import { LoginDto } from '../dto/login.dto';
import { IssueSessionService } from './services/issue-session.service';

export interface LoginResult {
  user: UserEntity;
  membership: MembershipEntity | null;
  tokens: AuthTokenEntity;
}

@Injectable()
export class LoginUseCase {
  constructor(
    private readonly findUserByEmailUseCase: FindUserByEmailUseCase,
    private readonly validatePasswordUseCase: ValidatePasswordUseCase,
    private readonly membershipsRepository: IMembershipsRepository,
    private readonly issueSessionService: IssueSessionService,
  ) {}

  async execute(data: LoginDto): Promise<LoginResult> {
    const user = await this.findUserByEmailUseCase.execute(data.email);

    if (!user?.passwordHash) {
      throw new InvalidCredentialsError();
    }

    const valid = await this.validatePasswordUseCase.execute(
      data.password,
      user.passwordHash,
    );

    if (!valid) {
      throw new InvalidCredentialsError();
    }

    if (user.disabledAt) {
      throw new AccountDisabledError();
    }

    const membership = await this.membershipsRepository.findActiveByUser(
      user.id,
    );

    const tokens = await this.issueSessionService.execute(
      user,
      membership ?? undefined,
    );

    return { user, membership, tokens };
  }
}
