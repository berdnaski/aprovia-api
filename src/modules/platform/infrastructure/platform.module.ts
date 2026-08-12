import { Module } from '@nestjs/common';
import { SuperAdminGuard } from 'src/shared/guards/super-admin.guard';
import { ListOrganizationsUseCase } from '../application/list-organizations.use-case';
import { IOrganizationReader } from '../domain/organization.reader';
import { OrganizationReader } from './organization.reader';
import { PlatformController } from './platform.controller';

@Module({
  controllers: [PlatformController],
  providers: [
    { provide: IOrganizationReader, useClass: OrganizationReader },
    ListOrganizationsUseCase,
    SuperAdminGuard,
  ],
})
export class PlatformModule {}
