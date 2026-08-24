import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { RegistrationStatus, ValidationStatus } from 'generated/prisma/enums';
import { PaginationQueryDto } from 'src/shared/dto/pagination-query.dto';

export class ListSuppliersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Busca por razão social, nome fantasia ou CNPJ.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @ApiPropertyOptional({
    enum: ['ACTIVE', 'CLOSED', 'INACTIVE', 'SUSPENDED', 'VOID', 'UNKNOWN'],
  })
  @IsOptional()
  @IsEnum(RegistrationStatus)
  registrationStatus?: RegistrationStatus;

  @ApiPropertyOptional({ enum: ['VALIDATED', 'PENDING', 'FAILED'] })
  @IsOptional()
  @IsEnum(ValidationStatus)
  validationStatus?: ValidationStatus;

  @ApiPropertyOptional({ description: 'Filtra bloqueados ou liberados.' })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (value === true || value === 'true') {
      return true;
    }

    if (value === false || value === 'false') {
      return false;
    }

    return value;
  })
  @IsBoolean()
  blocked?: boolean;
}
