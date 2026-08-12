import { Module } from '@nestjs/common';
import { AuthModule } from 'src/modules/auth/infrastructure/auth.module';
import { CompaniesModule } from 'src/modules/companies/infrastructure/companies.module';
import { CostCentersModule } from 'src/modules/cost-centers/infrastructure/cost-centers.module';
import { UsersModule } from 'src/modules/users/infrastructure/users.module';
import { AcceptInviteUseCase } from '../application/accept-invite.use-case';
import { CreateInviteUseCase } from '../application/create-invite.use-case';
import { ManageInvitesUseCase } from '../application/manage-invites.use-case';
import { SendInviteUseCase } from '../application/send-invite.use-case';
import { IInviteRepository } from '../domain/invites.repository.interface';
import { IMembershipReader } from '../domain/membership.reader';
import { InvitesController } from './invites.controller';
import { InviteRepository } from './invites.repository';
import { MembershipReader } from './membership.reader';

@Module({
  imports: [AuthModule, CompaniesModule, CostCentersModule, UsersModule],
  controllers: [InvitesController],
  providers: [
    { provide: IInviteRepository, useClass: InviteRepository },
    { provide: IMembershipReader, useClass: MembershipReader },
    SendInviteUseCase,
    CreateInviteUseCase,
    ManageInvitesUseCase,
    AcceptInviteUseCase,
  ],
  exports: [IInviteRepository, CreateInviteUseCase],
})
export class InvitesModule {}
