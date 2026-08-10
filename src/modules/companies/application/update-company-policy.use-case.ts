import { Injectable } from '@nestjs/common';
import { ValidationError } from 'src/shared/domain/errors/domain.error';
import { ICompanyRepository } from '../domain/companies.repository.interface';
import { CompanyEntity } from '../domain/company.entity';
import { UpdateCompanyPolicyDto } from '../dto/update-company-policy.dto';
import { FindCompanyByIdUseCase } from './find-company-by-id.use-case';

@Injectable()
export class UpdateCompanyPolicyUseCase {
  constructor(
    private readonly companyRepository: ICompanyRepository,
    private readonly findCompanyByIdUseCase: FindCompanyByIdUseCase,
  ) {}

  async execute(
    id: string,
    data: UpdateCompanyPolicyDto,
  ): Promise<CompanyEntity> {
    const company = await this.findCompanyByIdUseCase.execute(id);

    const reminderHours = data.reminderHours ?? company.reminderHours;
    const escalationHours = data.escalationHours ?? company.escalationHours;

    if (escalationHours <= reminderHours) {
      throw new ValidationError(
        'O prazo de escalonamento deve ser maior que o do lembrete',
      );
    }

    return this.companyRepository.updatePolicy(id, data);
  }
}
