-- Indexes for the most common tenant-scoped lookups. All are idempotent so the
-- migration is safe to re-run via db:setup.

CREATE INDEX IF NOT EXISTS "posts_tenant_id_idx" ON "posts" ("tenant_id");
CREATE INDEX IF NOT EXISTS "posts_tenant_status_idx" ON "posts" ("tenant_id", "status");
CREATE INDEX IF NOT EXISTS "posts_scheduled_at_idx" ON "posts" ("scheduled_at");

CREATE INDEX IF NOT EXISTS "leads_tenant_id_idx" ON "leads" ("tenant_id");

CREATE INDEX IF NOT EXISTS "events_tenant_id_idx" ON "events" ("tenant_id");
CREATE INDEX IF NOT EXISTS "events_lead_id_idx" ON "events" ("lead_id");

CREATE INDEX IF NOT EXISTS "social_accounts_tenant_id_idx" ON "social_accounts" ("tenant_id");
CREATE INDEX IF NOT EXISTS "social_accounts_tenant_platform_idx" ON "social_accounts" ("tenant_id", "platform");
CREATE INDEX IF NOT EXISTS "social_accounts_platform_user_id_idx" ON "social_accounts" ("platform_user_id");
