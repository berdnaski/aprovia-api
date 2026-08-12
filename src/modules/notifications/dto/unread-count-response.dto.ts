import { ApiProperty } from '@nestjs/swagger';

export class UnreadCountResponseDto {
  @ApiProperty({ example: 7 })
  unread: number;

  static from(this: void, unread: number): UnreadCountResponseDto {
    const dto = new UnreadCountResponseDto();
    dto.unread = unread;
    return dto;
  }
}
