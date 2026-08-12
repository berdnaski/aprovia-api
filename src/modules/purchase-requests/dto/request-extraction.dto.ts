import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class RequestExtractionDto {
  @ApiPropertyOptional({
    description: 'Texto livre colado pelo solicitante.',
    maxLength: 20000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(20000)
  text?: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description:
      'Anexo já enviado (task 4.2). A extração lê do storage, não recebe o arquivo aqui.',
  })
  @IsOptional()
  @IsUUID()
  fileId?: string;
}
