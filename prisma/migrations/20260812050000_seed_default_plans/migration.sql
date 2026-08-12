INSERT INTO "plans" ("id", "name", "tier", "price_cents", "max_members", "max_requests_month", "max_storage_bytes", "features", "active", "created_at", "updated_at")
VALUES
  (
    gen_random_uuid(), 'Essencial', 'BASIC', 9900,
    10, 100, 5368709120,
    '[]'::jsonb, true, NOW(), NOW()
  ),
  (
    gen_random_uuid(), 'Profissional', 'PROFESSIONAL', 29900,
    50, 1000, 53687091200,
    '["ai-extraction", "email-approval"]'::jsonb, true, NOW(), NOW()
  ),
  (
    gen_random_uuid(), 'Corporativo', 'ENTERPRISE', 99900,
    NULL, NULL, NULL,
    '["ai-extraction", "email-approval", "advanced-reports"]'::jsonb, true, NOW(), NOW()
  )
ON CONFLICT ("tier") DO NOTHING;
