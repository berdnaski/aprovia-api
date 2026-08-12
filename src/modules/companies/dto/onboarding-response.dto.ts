import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { OnboardingStep } from 'generated/prisma/enums';
import { OnboardingRequirement, OnboardingStatus } from '../domain/onboarding';

const STEPS = ['ACCOUNT', 'COMPANY', 'TEAM', 'REVIEW', 'DONE'];

export class AdvanceOnboardingDto {
  @ApiProperty({ enum: STEPS })
  @IsEnum(OnboardingStep)
  step: OnboardingStep;
}

export class OnboardingRequirementDto {
  @ApiProperty({ example: 'approvalMatrix' })
  key: string;

  @ApiProperty()
  label: string;

  @ApiProperty()
  done: boolean;

  @ApiProperty({ description: 'Itens não obrigatórios não impedem concluir.' })
  required: boolean;

  static fromDomain(
    this: void,
    requirement: OnboardingRequirement,
  ): OnboardingRequirementDto {
    const dto = new OnboardingRequirementDto();

    dto.key = requirement.key;
    dto.label = requirement.label;
    dto.done = requirement.done;
    dto.required = requirement.required;

    return dto;
  }
}

export class OnboardingStatusResponseDto {
  @ApiProperty({ enum: STEPS })
  step: OnboardingStep;

  @ApiProperty({ nullable: true, type: Date })
  completedAt: Date | null;

  @ApiProperty({ type: [OnboardingRequirementDto] })
  requirements: OnboardingRequirementDto[];

  @ApiProperty()
  canComplete: boolean;

  static fromDomain(
    this: void,
    status: OnboardingStatus,
  ): OnboardingStatusResponseDto {
    const dto = new OnboardingStatusResponseDto();

    dto.step = status.step;
    dto.completedAt = status.completedAt;
    dto.requirements = status.requirements.map(
      OnboardingRequirementDto.fromDomain,
    );
    dto.canComplete = status.canComplete;

    return dto;
  }
}
