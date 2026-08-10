import { Injectable } from '@nestjs/common';
import { NotFoundError } from 'src/shared/domain/errors/domain.error';
import { ICompanyRepository } from '../domain/companies.repository.interface';
import { CompanyEntity } from '../domain/company.entity';

@Injectable()
export class FindCompanyByIdUseCase {
  constructor(private readonly companyRepository: ICompanyRepository) {}

  async execute(id: string): Promise<CompanyEntity> {
    const company = await this.companyRepository.findById(id);

    if (!company) {
      throw new NotFoundError('Empresa', id);
    }

    return company;
  }
}
