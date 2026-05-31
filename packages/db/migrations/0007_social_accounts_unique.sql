-- Add unique constraints to social_accounts to prevent duplicate rows that
-- cause ambiguous webhook routing (H2 from code audit 2026-05-31).
--
-- social_accounts_tenant_platform_uniq  : one connected account per platform per tenant
-- social_accounts_platform_user_id_uniq : one tenant per platform user ID (prevents
--   the same social account from being linked to multiple tenants)
--
-- The existing non-unique index on (tenant_id, platform) is dropped and replaced
-- by the unique index, which subsumes it.

DROP INDEX IF EXISTS "social_accounts_tenant_platform_idx";

CREATE UNIQUE INDEX IF NOT EXISTS "social_accounts_tenant_platform_uniq"
  ON "social_accounts" ("tenant_id", "platform");

CREATE UNIQUE INDEX IF NOT EXISTS "social_accounts_platform_user_id_uniq"
  ON "social_accounts" ("platform", "platform_user_id");
