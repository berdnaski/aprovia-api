import { Global, Module } from '@nestjs/common';
import { IPasswordHasher } from '../../domain/password-hasher.interface';
import { BcryptPasswordHasher } from './bcrypt-password-hasher';

@Global()
@Module({
  providers: [{ provide: IPasswordHasher, useClass: BcryptPasswordHasher }],
  exports: [IPasswordHasher],
})
export class SecurityModule {}
