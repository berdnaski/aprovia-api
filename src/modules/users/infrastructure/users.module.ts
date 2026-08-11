import { forwardRef, Module } from '@nestjs/common';
import { CompaniesModule } from 'src/modules/companies/infrastructure/companies.module';
import { ChangeUserPasswordUseCase } from '../application/change-user-password.use-case';
import { CreateUserUseCase } from '../application/create-user.use-case';
import { MarkEmailAsVerifiedUseCase } from '../application/mark-email-as-verified.use-case';
import { DeleteAccountUseCase } from '../application/delete-account.use-case';
import { FindUserByEmailUseCase } from '../application/find-user-by-email.use-case';
import { FindUserByIdUseCase } from '../application/find-user-by-id.use-case';
import { ListUsersUseCase } from '../application/list-users.use-case';
import { UpdateUserProfileUseCase } from '../application/update-user-profile.use-case';
import { ValidatePasswordUseCase } from '../application/validate-password.use-case';
import { IUserRepository } from '../domain/users.repository.interface';
import { UserRepository } from './users.repository';
import { UsersController } from './users.controller';

@Module({
  imports: [forwardRef(() => CompaniesModule)],
  controllers: [UsersController],
  providers: [
    { provide: IUserRepository, useClass: UserRepository },
    CreateUserUseCase,
    FindUserByEmailUseCase,
    FindUserByIdUseCase,
    ValidatePasswordUseCase,
    UpdateUserProfileUseCase,
    DeleteAccountUseCase,
    ListUsersUseCase,
    MarkEmailAsVerifiedUseCase,
    ChangeUserPasswordUseCase,
  ],
  exports: [
    CreateUserUseCase,
    FindUserByEmailUseCase,
    FindUserByIdUseCase,
    ValidatePasswordUseCase,
    MarkEmailAsVerifiedUseCase,
    ChangeUserPasswordUseCase,
  ],
})
export class UsersModule {}
