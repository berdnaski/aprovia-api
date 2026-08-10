import { Injectable } from '@nestjs/common';
import { ICompanyRepository } from '../domain/companies.repository.interface';
import { CompanyEntity } from '../domain/company.entity';
import { UpdateCompanyDto } from '../dto/update-company.dto';
import { FindCompanyByIdUseCase } from './find-company-by-id.use-case';

@Injectable()
export class UpdateCompanyUseCase {
  constructor(
    private readonly companyRepository: ICompanyRepository,
    private readonly findCompanyByIdUseCase: FindCompanyByIdUseCase,
  ) {}

  async execute(id: string, data: UpdateCompanyDto): Promise<CompanyEntity> {
    await this.findCompanyByIdUseCase.execute(id);

    return this.companyRepository.update(id, data);
  }
}
