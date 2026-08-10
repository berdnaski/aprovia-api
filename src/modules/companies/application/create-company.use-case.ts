import { Injectable } from '@nestjs/common';
import { IssueSessionService } from 'src/modules/auth/application/services/issue-session.service';
import { AuthTokenEntity } from 'src/modules/auth/domain/auth-token.entity';
import { FindUserByIdUseCase } from 'src/modules/users/application/find-user-by-id.use-case';
import { DEFAULT_CATEGORIES } from 'src/shared/constants/default-categories';
import { ConflictError } from 'src/shared/domain/errors/domain.error';
import { isUniqueViolation } from 'src/shared/domain/prisma-error';
import { ICompanyRepository } from '../domain/companies.repository.interface';
import { ICompanyMemberRepository } from '../domain/company-members.repository.interface';
import { CompanyEntity } from '../domain/company.entity';
import { CreateCompanyDto } from '../dto/create-company.dto';

export interface CreateCompanyResult {
  company: CompanyEntity;
  tokens: AuthTokenEntity;
}

@Injectable()
export class CreateCompanyUseCase {
  constructor(
    private readonly companyRepository: ICompanyRepository,
    private readonly companyMemberRepository: ICompanyMemberRepository,
    private readonly findUserByIdUseCase: FindUserByIdUseCase,
    private readonly issueSessionService: IssueSessionService,
  ) {}

  async execute(
    userId: string,
    data: CreateCompanyDto,
  ): Promise<CreateCompanyResult> {
    const existing =
      await this.companyMemberRepository.findActiveByUser(userId);

    if (existing) {
      throw new ConflictError('Você já pertence a uma empresa');
    }

    const user = await this.findUserByIdUseCase.execute(userId);

    try {
      const { company, owner } = await this.companyRepository.create({
        ownerId: userId,
        legalName: data.legalName,
        tradeName: data.tradeName,
        cnpj: data.cnpj,
        industry: data.industry,
        companySize: data.companySize,
        categories: DEFAULT_CATEGORIES,
      });

      const tokens = await this.issueSessionService.execute(user, {
        companyId: company.id,
        memberId: owner.id,
        role: owner.role,
      });

      return { company, tokens };
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictError('O CNPJ informado já está cadastrado');
      }
      throw error;
    }
  }
}
