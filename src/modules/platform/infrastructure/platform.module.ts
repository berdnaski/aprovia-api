import { Module } from '@nestjs/common';
import { SuperAdminGuard } from 'src/shared/guards/super-admin.guard';
import { ManagePlansUseCase } from '../application/manage-plans.use-case';
import { FindOrganizationUseCase } from '../application/find-organization.use-case';
import { ListOrganizationsUseCase } from '../application/list-organizations.use-case';
import { IOrganizationReader } from '../domain/organization.reader';
import { OrganizationReader } from './organization.reader';
import { PlatformController } from './platform.controller';

@Module({
  controllers: [PlatformController],
  providers: [
    { provide: IOrganizationReader, useClass: OrganizationReader },
    ListOrganizationsUseCase,
    FindOrganizationUseCase,
    ManagePlansUseCase,
    SuperAdminGuard,
  ],
})
export class PlatformModule {}
