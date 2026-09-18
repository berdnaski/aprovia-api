import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BankAccountType, PixKeyType } from 'generated/prisma/enums';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';

export class RequestBankAccountDto {
  @ApiProperty({ example: '341', description: 'Código do banco (3 dígitos).' })
  @IsString()
  @Length(3, 3)
  bankCode: string;

  @ApiProperty({ example: '1234' })
  @IsString()
  @MaxLength(20)
  branch: string;

  @ApiProperty({ example: '00012345' })
  @IsString()
  @MaxLength(20)
  accountNumber: string;

  @ApiPropertyOptional({ example: '6', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(2)
  accountDigit?: string | null;

  @ApiProperty({ enum: BankAccountType })
  @IsEnum(BankAccountType)
  accountType: BankAccountType;

  @ApiProperty({ example: 'Acme Indústria LTDA', maxLength: 180 })
  @IsString()
  @MaxLength(180)
  holderName: string;

  @ApiProperty({
    example: '12345678000199',
    description: 'CPF ou CNPJ do titular da conta, com ou sem máscara.',
  })
  @IsString()
  @Length(11, 18)
  holderDocument: string;

  @ApiPropertyOptional({ enum: PixKeyType })
  @IsOptional()
  @IsEnum(PixKeyType)
  pixKeyType?: PixKeyType;

  @ApiPropertyOptional({ maxLength: 140, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(140)
  pixKey?: string | null;

  @ApiPropertyOptional({
    description:
      'true quando o titular da conta é diferente do fornecedor (fatoração, representante etc).',
  })
  @IsOptional()
  @IsBoolean()
  thirdParty?: boolean;

  @ApiPropertyOptional({
    maxLength: 500,
    nullable: true,
    description: 'Obrigatório quando thirdParty é true.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  justification?: string | null;
}
