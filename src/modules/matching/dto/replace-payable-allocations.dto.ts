import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, ValidateNested } from 'class-validator';
import { AllocationLineDto } from 'src/modules/purchase-requests/dto/replace-allocations.dto';

export class ReplacePayableAllocationsDto {
  @ApiProperty({ type: [AllocationLineDto] })
  @ValidateNested({ each: true })
  @Type(() => AllocationLineDto)
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  lines: AllocationLineDto[];
}
