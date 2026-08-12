import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ApprovalRulesModule } from 'src/modules/approval-rules/infrastructure/approval-rules.module';
import { BudgetsModule } from 'src/modules/budgets/infrastructure/budgets.module';
import { CategoriesModule } from 'src/modules/categories/infrastructure/categories.module';
import { AuthModule } from 'src/modules/auth/infrastructure/auth.module';
import { BillingModule } from 'src/modules/billing/infrastructure/billing.module';
import { CompaniesModule } from 'src/modules/companies/infrastructure/companies.module';
import { CostCentersModule } from 'src/modules/cost-centers/infrastructure/cost-centers.module';
import { SuppliersModule } from 'src/modules/suppliers/infrastructure/suppliers.module';
import { QueueName } from 'src/shared/infrastructure/queue/queue-name';
import { CreateDraftUseCase } from '../application/create-draft.use-case';
import { DeleteDraftUseCase } from '../application/delete-draft.use-case';
import { DuplicateRequestUseCase } from '../application/duplicate-request.use-case';
import { FindRequestByIdUseCase } from '../application/find-request-by-id.use-case';
import { ListRequestsUseCase } from '../application/list-requests.use-case';
import { ManageRequestFilesUseCase } from '../application/manage-request-files.use-case';
import { ManageRequestItemsUseCase } from '../application/manage-request-items.use-case';
import { GetExtractionResultUseCase } from '../application/get-extraction-result.use-case';
import { GetRequestTimelineUseCase } from '../application/get-request-timeline.use-case';
import { RequestExtractionUseCase } from '../application/request-extraction.use-case';
import { CancelRequestUseCase } from '../application/cancel-request.use-case';
import { DecideByEmailUseCase } from '../application/decide-by-email.use-case';
import { GetEmailApprovalUseCase } from '../application/get-email-approval.use-case';
import { NotifyPendingApprovalUseCase } from '../application/notify-pending-approval.use-case';
import { DecideRequestUseCase } from '../application/decide-request.use-case';
import { ReassignStepUseCase } from '../application/reassign-step.use-case';
import { SubmitRequestUseCase } from '../application/submit-request.use-case';
import { UpdateDraftUseCase } from '../application/update-draft.use-case';
import { IExtractionResultRepository } from '../domain/extraction-results.repository.interface';
import { IApprovalStepWriter } from '../domain/approval-steps.writer';
import { ISlaStepRepository } from '../domain/sla-steps.repository.interface';
import { IDecisionRepository } from '../domain/decisions.repository.interface';
import { IExtractionService } from '../domain/extraction.service';
import { IApprovalStepReader } from '../domain/request-timeline';
import { IPurchaseRequestRepository } from '../domain/purchase-requests.repository.interface';
import { IRequestFileRepository } from '../domain/request-files.repository.interface';
import { IRequestItemRepository } from '../domain/request-items.repository.interface';
import { ApprovalStepReader } from './approval-steps.reader';
import { ApprovalStepWriter } from './approval-steps.writer';
import { DecisionRepository } from './decisions.repository';
import { ExtractionProcessor } from './extraction.processor';
import { ExtractionResultRepository } from './extraction-results.repository';
import { LlmExtractionService } from './llm-extraction.service';
import { EmailApprovalsController } from './email-approvals.controller';
import { PurchaseRequestsController } from './purchase-requests.controller';
import { RequestFilesController } from './request-files.controller';
import { RequestItemsController } from './request-items.controller';
import { PurchaseRequestRepository } from './purchase-requests.repository';
import { SlaStepRepository } from './sla-steps.repository';
import { RequestFileRepository } from './request-files.repository';
import { RequestItemRepository } from './request-items.repository';

@Module({
  imports: [
    CostCentersModule,
    CategoriesModule,
    SuppliersModule,
    ApprovalRulesModule,
    CompaniesModule,
    BudgetsModule,
    AuthModule,
    BillingModule,
    BullModule.registerQueue({ name: QueueName.AI_EXTRACTION }),
    BullModule.registerQueue({ name: QueueName.DEAD_LETTER }),
  ],
  controllers: [
    PurchaseRequestsController,
    RequestItemsController,
    RequestFilesController,
    EmailApprovalsController,
  ],
  providers: [
    {
      provide: IPurchaseRequestRepository,
      useClass: PurchaseRequestRepository,
    },
    { provide: IRequestItemRepository, useClass: RequestItemRepository },
    { provide: IRequestFileRepository, useClass: RequestFileRepository },
    { provide: IExtractionService, useClass: LlmExtractionService },
    {
      provide: IExtractionResultRepository,
      useClass: ExtractionResultRepository,
    },
    { provide: IApprovalStepReader, useClass: ApprovalStepReader },
    { provide: IApprovalStepWriter, useClass: ApprovalStepWriter },
    { provide: IDecisionRepository, useClass: DecisionRepository },
    { provide: ISlaStepRepository, useClass: SlaStepRepository },
    CreateDraftUseCase,
    UpdateDraftUseCase,
    DeleteDraftUseCase,
    DuplicateRequestUseCase,
    FindRequestByIdUseCase,
    ListRequestsUseCase,
    ManageRequestItemsUseCase,
    ManageRequestFilesUseCase,
    RequestExtractionUseCase,
    GetExtractionResultUseCase,
    GetRequestTimelineUseCase,
    SubmitRequestUseCase,
    DecideRequestUseCase,
    CancelRequestUseCase,
    ReassignStepUseCase,
    NotifyPendingApprovalUseCase,
    GetEmailApprovalUseCase,
    DecideByEmailUseCase,
    ExtractionProcessor,
  ],
  exports: [
    IPurchaseRequestRepository,
    IRequestItemRepository,
    ISlaStepRepository,
    FindRequestByIdUseCase,
    NotifyPendingApprovalUseCase,
  ],
})
export class PurchaseRequestsModule {}
