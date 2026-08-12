CREATE TYPE "TokenType" AS ENUM ('EMAIL_VERIFICATION', 'PASSWORD_RESET', 'PASSWORD_CHANGE', 'INVITE', 'APPROVAL_ACTION');

CREATE TYPE "OnboardingStep" AS ENUM ('ACCOUNT', 'COMPANY', 'TEAM', 'REVIEW', 'DONE');

CREATE TYPE "CompanyMemberRole" AS ENUM ('REQUESTER', 'APPROVER', 'FINANCE_ADMIN');

CREATE TYPE "InviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED');

CREATE TYPE "BudgetEntryType" AS ENUM ('CONSUMPTION', 'REVERSAL');

CREATE TYPE "ApproverType" AS ENUM ('DIRECT_MANAGER', 'COST_CENTER_MANAGER');

CREATE TYPE "RegistrationStatus" AS ENUM ('ACTIVE', 'CLOSED', 'INACTIVE', 'SUSPENDED', 'VOID', 'UNKNOWN');

CREATE TYPE "ValidationStatus" AS ENUM ('VALIDATED', 'PENDING', 'FAILED');

CREATE TYPE "Urgency" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

CREATE TYPE "RequestStatus" AS ENUM ('DRAFT', 'PENDING', 'CHANGES_REQUESTED', 'APPROVED', 'REJECTED', 'CANCELED', 'COMPLETED');

CREATE TYPE "FileType" AS ENUM ('REQUEST_ATTACHMENT', 'USER_AVATAR', 'COMPANY_LOGO');

CREATE TYPE "StepStatus" AS ENUM ('WAITING', 'APPROVED', 'REJECTED', 'ESCALATED', 'CANCELED');

CREATE TYPE "DecisionType" AS ENUM ('APPROVED', 'REJECTED', 'CHANGES_REQUESTED', 'APPROVED_WITH_OVERRIDE');

CREATE TYPE "DecisionChannel" AS ENUM ('PLATFORM', 'EMAIL');

CREATE TYPE "AuditEventType" AS ENUM ('CREATED', 'SUBMITTED', 'APPROVED', 'REJECTED', 'CHANGES_REQUESTED', 'CANCELED', 'REASSIGNED', 'ESCALATED', 'RULES_CHANGED', 'BUDGET_CHANGED', 'MEMBER_CHANGED');

CREATE TYPE "NotificationEvent" AS ENUM ('INVITE_RECEIVED', 'REQUEST_PENDING', 'DECISION_MADE', 'REQUEST_RETURNED', 'SLA_REMINDER', 'ESCALATED', 'BUDGET_ALERT', 'MONTHLY_REPORT');

CREATE TYPE "PlanTier" AS ENUM ('BASIC', 'PROFESSIONAL', 'ENTERPRISE');

CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'TRIALING', 'CANCELED', 'EXPIRED');

CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "password_hash" TEXT,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "avatar_url" TEXT,
    "is_super_admin" BOOLEAN NOT NULL DEFAULT false,
    "terms_accepted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "disabled_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "type" "TokenType" NOT NULL,
    "value" TEXT NOT NULL,
    "reference_id" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "consumed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tokens_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "companies" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "legal_name" TEXT NOT NULL,
    "trade_name" TEXT,
    "cnpj" CHAR(14) NOT NULL,
    "industry" TEXT,
    "company_size" TEXT,
    "onboarding_step" "OnboardingStep" NOT NULL DEFAULT 'ACCOUNT',
    "onboarding_completed_at" TIMESTAMP(3),
    "overrun_tolerance_percent" DECIMAL(5,2) NOT NULL DEFAULT 5.00,
    "reminder_hours" INTEGER NOT NULL DEFAULT 24,
    "escalation_hours" INTEGER NOT NULL DEFAULT 72,
    "dual_approval_threshold_cents" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "disabled_at" TIMESTAMP(3),

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "company_members" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "role" "CompanyMemberRole" NOT NULL DEFAULT 'REQUESTER',
    "approval_limit_cents" BIGINT NOT NULL DEFAULT 0,
    "default_cost_center_id" TEXT,
    "manager_id" TEXT,
    "absent_from" DATE,
    "absent_until" DATE,
    "substitute_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "disabled_at" TIMESTAMP(3),

    CONSTRAINT "company_members_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "invites" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "CompanyMemberRole" NOT NULL DEFAULT 'REQUESTER',
    "default_cost_center_id" TEXT,
    "manager_id" TEXT,
    "status" "InviteStatus" NOT NULL DEFAULT 'PENDING',
    "invited_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "accepted_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),

    CONSTRAINT "invites_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "cost_centers" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "manager_id" TEXT NOT NULL,
    "parent_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "disabled_at" TIMESTAMP(3),

    CONSTRAINT "cost_centers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "cost_center_members" (
    "id" TEXT NOT NULL,
    "cost_center_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cost_center_members_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "budgets" (
    "id" TEXT NOT NULL,
    "cost_center_id" TEXT NOT NULL,
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "total_amount_cents" BIGINT NOT NULL,
    "change_reason" TEXT,
    "updated_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "budgets_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "budget_entries" (
    "id" TEXT NOT NULL,
    "budget_id" TEXT NOT NULL,
    "purchase_request_id" TEXT NOT NULL,
    "type" "BudgetEntryType" NOT NULL,
    "amount_cents" BIGINT NOT NULL,
    "description" TEXT,
    "recorded_by_id" TEXT,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "budget_entries_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "approval_rules" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "cost_center_id" TEXT,
    "category_id" TEXT,
    "min_amount_cents" BIGINT NOT NULL,
    "max_amount_cents" BIGINT,
    "approver_type" "ApproverType" NOT NULL,
    "requires_dual_approval" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "approval_rules_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "suppliers" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "cnpj" CHAR(14) NOT NULL,
    "legal_name" TEXT NOT NULL,
    "trade_name" TEXT,
    "registration_status" "RegistrationStatus" NOT NULL DEFAULT 'UNKNOWN',
    "validation_status" "ValidationStatus" NOT NULL DEFAULT 'PENDING',
    "street" TEXT,
    "city" TEXT,
    "state" CHAR(2),
    "zip_code" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "validated_at" TIMESTAMP(3),
    "blocked" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "purchase_requests" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "requester_id" TEXT NOT NULL,
    "cost_center_id" TEXT NOT NULL,
    "category_id" TEXT,
    "supplier_id" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "total_amount_cents" BIGINT NOT NULL,
    "urgency" "Urgency" NOT NULL DEFAULT 'MEDIUM',
    "status" "RequestStatus" NOT NULL DEFAULT 'DRAFT',
    "payment_terms" TEXT,
    "requires_override" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submitted_at" TIMESTAMP(3),
    "finalized_at" TIMESTAMP(3),
    "canceled_by_id" TEXT,
    "cancel_reason" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_requests_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "request_items" (
    "id" TEXT NOT NULL,
    "purchase_request_id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "unit" TEXT NOT NULL,
    "unit_price_cents" BIGINT NOT NULL,
    "total_cents" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "request_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "files" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "type" "FileType" NOT NULL,
    "purchase_request_id" TEXT,
    "user_id" TEXT,
    "file_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" BIGINT NOT NULL,
    "storage_key" TEXT NOT NULL,
    "uploaded_by_id" TEXT NOT NULL,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "files_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "approval_steps" (
    "id" TEXT NOT NULL,
    "purchase_request_id" TEXT NOT NULL,
    "expected_approver_id" TEXT NOT NULL,
    "step_order" INTEGER NOT NULL,
    "status" "StepStatus" NOT NULL DEFAULT 'WAITING',
    "requires_dual_approval" BOOLEAN NOT NULL DEFAULT false,
    "reminder_due_at" TIMESTAMP(3),
    "escalation_due_at" TIMESTAMP(3),
    "escalated_from_id" TEXT,
    "escalated_at" TIMESTAMP(3),
    "started_at" TIMESTAMP(3),
    "ended_at" TIMESTAMP(3),

    CONSTRAINT "approval_steps_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "decisions" (
    "id" TEXT NOT NULL,
    "approval_step_id" TEXT NOT NULL,
    "decider_id" TEXT NOT NULL,
    "on_behalf_of_id" TEXT,
    "type" "DecisionType" NOT NULL,
    "justification" TEXT,
    "budget_at_time_cents" BIGINT NOT NULL,
    "committed_at_time_cents" BIGINT NOT NULL,
    "available_at_time_cents" BIGINT NOT NULL,
    "channel" "DecisionChannel" NOT NULL DEFAULT 'PLATFORM',
    "ip_address" TEXT,
    "decided_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "decisions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "actor_id" TEXT,
    "event_type" "AuditEventType" NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "old_data" JSONB,
    "new_data" JSONB,
    "ip_address" TEXT,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "recipient_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "event" "NotificationEvent" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "link" TEXT,
    "read_at" TIMESTAMP(3),
    "sent_by_email" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "plans" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tier" "PlanTier" NOT NULL,
    "price_cents" BIGINT NOT NULL,
    "max_members" INTEGER,
    "max_requests_month" INTEGER,
    "max_storage_bytes" BIGINT,
    "features" JSONB NOT NULL DEFAULT '[]',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3),
    "contracted_price_cents" BIGINT,
    "feature_overrides" JSONB,
    "canceled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

CREATE UNIQUE INDEX "tokens_value_key" ON "tokens"("value");

CREATE INDEX "tokens_user_id_type_idx" ON "tokens"("user_id", "type");

CREATE INDEX "tokens_expires_at_idx" ON "tokens"("expires_at");

CREATE UNIQUE INDEX "companies_slug_key" ON "companies"("slug");

CREATE UNIQUE INDEX "companies_cnpj_key" ON "companies"("cnpj");

CREATE INDEX "company_members_company_id_role_idx" ON "company_members"("company_id", "role");

CREATE INDEX "company_members_manager_id_idx" ON "company_members"("manager_id");

CREATE UNIQUE INDEX "company_members_user_id_company_id_key" ON "company_members"("user_id", "company_id");

CREATE INDEX "invites_company_id_status_idx" ON "invites"("company_id", "status");

CREATE INDEX "invites_email_idx" ON "invites"("email");

CREATE INDEX "cost_centers_company_id_idx" ON "cost_centers"("company_id");

CREATE INDEX "cost_centers_manager_id_idx" ON "cost_centers"("manager_id");

CREATE UNIQUE INDEX "cost_centers_company_id_name_key" ON "cost_centers"("company_id", "name");

CREATE UNIQUE INDEX "cost_centers_company_id_code_key" ON "cost_centers"("company_id", "code");

CREATE INDEX "cost_center_members_cost_center_id_idx" ON "cost_center_members"("cost_center_id");

CREATE INDEX "cost_center_members_member_id_idx" ON "cost_center_members"("member_id");

CREATE UNIQUE INDEX "cost_center_members_cost_center_id_member_id_key" ON "cost_center_members"("cost_center_id", "member_id");

CREATE INDEX "budgets_cost_center_id_period_start_period_end_idx" ON "budgets"("cost_center_id", "period_start", "period_end");

CREATE UNIQUE INDEX "budgets_cost_center_id_period_start_key" ON "budgets"("cost_center_id", "period_start");

CREATE INDEX "budget_entries_budget_id_idx" ON "budget_entries"("budget_id");

CREATE INDEX "budget_entries_purchase_request_id_idx" ON "budget_entries"("purchase_request_id");

CREATE INDEX "budget_entries_budget_id_occurred_at_idx" ON "budget_entries"("budget_id", "occurred_at");

CREATE INDEX "approval_rules_company_id_min_amount_cents_idx" ON "approval_rules"("company_id", "min_amount_cents");

CREATE INDEX "approval_rules_company_id_is_active_idx" ON "approval_rules"("company_id", "is_active");

CREATE INDEX "suppliers_company_id_registration_status_idx" ON "suppliers"("company_id", "registration_status");

CREATE INDEX "suppliers_validated_at_idx" ON "suppliers"("validated_at");

CREATE UNIQUE INDEX "suppliers_company_id_cnpj_key" ON "suppliers"("company_id", "cnpj");

CREATE INDEX "categories_company_id_active_idx" ON "categories"("company_id", "active");

CREATE UNIQUE INDEX "categories_company_id_name_key" ON "categories"("company_id", "name");

CREATE INDEX "purchase_requests_company_id_status_idx" ON "purchase_requests"("company_id", "status");

CREATE INDEX "purchase_requests_requester_id_status_idx" ON "purchase_requests"("requester_id", "status");

CREATE INDEX "purchase_requests_cost_center_id_status_idx" ON "purchase_requests"("cost_center_id", "status");

CREATE INDEX "purchase_requests_supplier_id_created_at_idx" ON "purchase_requests"("supplier_id", "created_at");

CREATE INDEX "purchase_requests_company_id_created_at_idx" ON "purchase_requests"("company_id", "created_at");

CREATE UNIQUE INDEX "purchase_requests_company_id_number_key" ON "purchase_requests"("company_id", "number");

CREATE INDEX "request_items_purchase_request_id_idx" ON "request_items"("purchase_request_id");

CREATE INDEX "files_purchase_request_id_idx" ON "files"("purchase_request_id");

CREATE INDEX "files_company_id_type_idx" ON "files"("company_id", "type");

CREATE INDEX "approval_steps_purchase_request_id_step_order_idx" ON "approval_steps"("purchase_request_id", "step_order");

CREATE INDEX "approval_steps_expected_approver_id_status_idx" ON "approval_steps"("expected_approver_id", "status");

CREATE INDEX "approval_steps_status_escalation_due_at_idx" ON "approval_steps"("status", "escalation_due_at");

CREATE INDEX "approval_steps_status_reminder_due_at_idx" ON "approval_steps"("status", "reminder_due_at");

CREATE UNIQUE INDEX "approval_steps_purchase_request_id_step_order_key" ON "approval_steps"("purchase_request_id", "step_order");

CREATE INDEX "decisions_approval_step_id_idx" ON "decisions"("approval_step_id");

CREATE INDEX "decisions_decider_id_decided_at_idx" ON "decisions"("decider_id", "decided_at");

CREATE INDEX "audit_logs_company_id_occurred_at_idx" ON "audit_logs"("company_id", "occurred_at");

CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

CREATE INDEX "audit_logs_actor_id_occurred_at_idx" ON "audit_logs"("actor_id", "occurred_at");

CREATE INDEX "audit_logs_company_id_event_type_occurred_at_idx" ON "audit_logs"("company_id", "event_type", "occurred_at");

CREATE INDEX "notifications_recipient_id_read_at_idx" ON "notifications"("recipient_id", "read_at");

CREATE INDEX "notifications_recipient_id_created_at_idx" ON "notifications"("recipient_id", "created_at");

CREATE UNIQUE INDEX "plans_tier_key" ON "plans"("tier");

CREATE INDEX "subscriptions_company_id_status_idx" ON "subscriptions"("company_id", "status");

ALTER TABLE "tokens" ADD CONSTRAINT "tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "company_members" ADD CONSTRAINT "company_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "company_members" ADD CONSTRAINT "company_members_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "company_members" ADD CONSTRAINT "company_members_default_cost_center_id_fkey" FOREIGN KEY ("default_cost_center_id") REFERENCES "cost_centers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "company_members" ADD CONSTRAINT "company_members_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "company_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "company_members" ADD CONSTRAINT "company_members_substitute_id_fkey" FOREIGN KEY ("substitute_id") REFERENCES "company_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "invites" ADD CONSTRAINT "invites_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "invites" ADD CONSTRAINT "invites_invited_by_id_fkey" FOREIGN KEY ("invited_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "invites" ADD CONSTRAINT "invites_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "company_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "invites" ADD CONSTRAINT "invites_default_cost_center_id_fkey" FOREIGN KEY ("default_cost_center_id") REFERENCES "cost_centers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "cost_centers" ADD CONSTRAINT "cost_centers_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "cost_centers" ADD CONSTRAINT "cost_centers_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "company_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "cost_centers" ADD CONSTRAINT "cost_centers_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "cost_centers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "cost_center_members" ADD CONSTRAINT "cost_center_members_cost_center_id_fkey" FOREIGN KEY ("cost_center_id") REFERENCES "cost_centers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "cost_center_members" ADD CONSTRAINT "cost_center_members_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "company_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "budgets" ADD CONSTRAINT "budgets_cost_center_id_fkey" FOREIGN KEY ("cost_center_id") REFERENCES "cost_centers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "budgets" ADD CONSTRAINT "budgets_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "budget_entries" ADD CONSTRAINT "budget_entries_budget_id_fkey" FOREIGN KEY ("budget_id") REFERENCES "budgets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "budget_entries" ADD CONSTRAINT "budget_entries_purchase_request_id_fkey" FOREIGN KEY ("purchase_request_id") REFERENCES "purchase_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "budget_entries" ADD CONSTRAINT "budget_entries_recorded_by_id_fkey" FOREIGN KEY ("recorded_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "approval_rules" ADD CONSTRAINT "approval_rules_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "approval_rules" ADD CONSTRAINT "approval_rules_cost_center_id_fkey" FOREIGN KEY ("cost_center_id") REFERENCES "cost_centers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "approval_rules" ADD CONSTRAINT "approval_rules_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "categories" ADD CONSTRAINT "categories_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "purchase_requests" ADD CONSTRAINT "purchase_requests_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "purchase_requests" ADD CONSTRAINT "purchase_requests_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "company_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "purchase_requests" ADD CONSTRAINT "purchase_requests_cost_center_id_fkey" FOREIGN KEY ("cost_center_id") REFERENCES "cost_centers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "purchase_requests" ADD CONSTRAINT "purchase_requests_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "purchase_requests" ADD CONSTRAINT "purchase_requests_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "purchase_requests" ADD CONSTRAINT "purchase_requests_canceled_by_id_fkey" FOREIGN KEY ("canceled_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "request_items" ADD CONSTRAINT "request_items_purchase_request_id_fkey" FOREIGN KEY ("purchase_request_id") REFERENCES "purchase_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "files" ADD CONSTRAINT "files_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "files" ADD CONSTRAINT "files_purchase_request_id_fkey" FOREIGN KEY ("purchase_request_id") REFERENCES "purchase_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "files" ADD CONSTRAINT "files_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "files" ADD CONSTRAINT "files_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "approval_steps" ADD CONSTRAINT "approval_steps_purchase_request_id_fkey" FOREIGN KEY ("purchase_request_id") REFERENCES "purchase_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "approval_steps" ADD CONSTRAINT "approval_steps_expected_approver_id_fkey" FOREIGN KEY ("expected_approver_id") REFERENCES "company_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "approval_steps" ADD CONSTRAINT "approval_steps_escalated_from_id_fkey" FOREIGN KEY ("escalated_from_id") REFERENCES "company_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "decisions" ADD CONSTRAINT "decisions_approval_step_id_fkey" FOREIGN KEY ("approval_step_id") REFERENCES "approval_steps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "decisions" ADD CONSTRAINT "decisions_decider_id_fkey" FOREIGN KEY ("decider_id") REFERENCES "company_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "decisions" ADD CONSTRAINT "decisions_on_behalf_of_id_fkey" FOREIGN KEY ("on_behalf_of_id") REFERENCES "company_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "notifications" ADD CONSTRAINT "notifications_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
