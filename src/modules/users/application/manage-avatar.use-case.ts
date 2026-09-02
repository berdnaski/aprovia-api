import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { NotFoundError, ValidationError } from 'src/shared/domain/errors/domain.error';
import { AllowedMimeType, detectMimeType } from 'src/shared/domain/file-signature';
import { IStorageService } from 'src/shared/domain/storage.service';
import { UserEntity } from '../domain/user.entity';
import { IUserRepository } from '../domain/users.repository.interface';

const IMAGE_TYPES: AllowedMimeType[] = [
  AllowedMimeType.PNG,
  AllowedMimeType.JPEG,
  AllowedMimeType.WEBP,
];

export interface AvatarFile {
  buffer: Buffer;
}

@Injectable()
export class ManageAvatarUseCase {
  constructor(
    private readonly usersRepository: IUserRepository,
    private readonly storageService: IStorageService,
  ) {}

  async upload(userId: string, file: AvatarFile | undefined): Promise<UserEntity> {
    if (!file) {
      throw new ValidationError('Escolha uma imagem para usar como foto.');
    }

    const detected = detectMimeType(file.buffer);

    if (!detected || !IMAGE_TYPES.includes(detected)) {
      throw new ValidationError(
        'A foto precisa ser uma imagem PNG, JPG ou WEBP.',
      );
    }

    const current = await this.usersRepository.findById(userId);

    if (!current) {
      throw new NotFoundError('Usuário');
    }

    const storageKey = `users/${userId}/avatar/${randomUUID()}`;

    await this.storageService.upload({
      storageKey,
      body: file.buffer,
      mimeType: detected,
    });

    const updated = await this.usersRepository.setAvatar(userId, storageKey);

    if (current.avatarStorageKey) {
      await this.storageService.delete(current.avatarStorageKey).catch(() => undefined);
    }

    return updated;
  }

  async remove(userId: string): Promise<UserEntity> {
    const current = await this.usersRepository.findById(userId);

    if (!current) {
      throw new NotFoundError('Usuário');
    }

    const updated = await this.usersRepository.setAvatar(userId, null);

    if (current.avatarStorageKey) {
      await this.storageService.delete(current.avatarStorageKey).catch(() => undefined);
    }

    return updated;
  }

  async read(userId: string): Promise<{ body: Buffer; mimeType: string }> {
    const user = await this.usersRepository.findById(userId);

    if (!user?.avatarStorageKey) {
      throw new NotFoundError('Foto de perfil');
    }

    const body = await this.storageService.getObject(user.avatarStorageKey);
    const mimeType = detectMimeType(body) ?? AllowedMimeType.PNG;

    return { body, mimeType };
  }
}
