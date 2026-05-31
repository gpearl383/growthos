-- ----------------------------------------------------------------------------
-- GrowthOS — Supabase catch-up migrations (0001 → 0006)
--
-- Run this in the Supabase SQL Editor for the project that backs production
-- (the one your DATABASE_URL points at). Every statement is idempotent — uses
-- IF NOT EXISTS, ADD VALUE IF NOT EXISTS, or EXCEPTION WHEN duplicate_object
-- — so it's safe to re-run, and safe to run against a DB that already has
-- some of the changes from a partial migration history.
--
-- After this runs you should see:
--   - tenants.website_url               (column)
--   - tenant_secrets                    (table + secret_provider enum)
--   - media_assets                      (table + media_asset_type enum)
--   - posts.alt_text / media_type / audio_url / studio_metadata (columns)
--   - platform enum                     (now includes 'tiktok')
--   - post_status enum                  (now includes 'publishing')
--   - All tenant-scoped indexes for posts / leads / events / social_accounts
-- ----------------------------------------------------------------------------

-- ---------- 0001: add tiktok to platform enum -------------------------------
ALTER TYPE "platform" ADD VALUE IF NOT EXISTS 'tiktok';

-- ---------- 0002: post studio (media + new post columns) --------------------
DO $$ BEGIN
  CREATE TYPE "media_asset_type" AS ENUM ('image', 'video', 'audio');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "alt_text" text;
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "media_type" "media_asset_type";
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "audio_url" text;
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "studio_metadata" jsonb DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS "media_assets" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE cascade,
  "url" text NOT NULL,
  "type" "media_asset_type" NOT NULL,
  "filename" text,
  "mime_type" text,
  "alt_text" text,
  "source" text DEFAULT 'upload' NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "media_assets_tenant_id_idx" ON "media_assets" ("tenant_id");

-- ---------- 0003: tenant-scoped lookup indexes ------------------------------
CREATE INDEX IF NOT EXISTS "posts_tenant_id_idx" ON "posts" ("tenant_id");
CREATE INDEX IF NOT EXISTS "posts_tenant_status_idx" ON "posts" ("tenant_id", "status");
CREATE INDEX IF NOT EXISTS "posts_scheduled_at_idx" ON "posts" ("scheduled_at");

CREATE INDEX IF NOT EXISTS "leads_tenant_id_idx" ON "leads" ("tenant_id");

CREATE INDEX IF NOT EXISTS "events_tenant_id_idx" ON "events" ("tenant_id");
CREATE INDEX IF NOT EXISTS "events_lead_id_idx" ON "events" ("lead_id");

CREATE INDEX IF NOT EXISTS "social_accounts_tenant_id_idx" ON "social_accounts" ("tenant_id");
CREATE INDEX IF NOT EXISTS "social_accounts_tenant_platform_idx" ON "social_accounts" ("tenant_id", "platform");
CREATE INDEX IF NOT EXISTS "social_accounts_platform_user_id_idx" ON "social_accounts" ("platform_user_id");

-- ---------- 0004: per-tenant encrypted API keys -----------------------------
DO $$ BEGIN
  CREATE TYPE "secret_provider" AS ENUM ('anthropic', 'openai', 'elevenlabs');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "tenant_secrets" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE cascade,
  "provider" "secret_provider" NOT NULL,
  "value_enc" text NOT NULL,
  "last4" text,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "tenant_secrets_tenant_provider_idx" ON "tenant_secrets" ("tenant_id", "provider");

-- ---------- 0005: add 'publishing' to post_status enum ----------------------
ALTER TYPE "post_status" ADD VALUE IF NOT EXISTS 'publishing';

-- ---------- 0006: optional business website URL on tenants ------------------
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "website_url" text;

-- ---------- 0007: unique constraints on social_accounts (H2) ----------------
-- One connected account per platform per tenant; one tenant per platform user.
DROP INDEX IF EXISTS "social_accounts_tenant_platform_idx";

CREATE UNIQUE INDEX IF NOT EXISTS "social_accounts_tenant_platform_uniq"
  ON "social_accounts" ("tenant_id", "platform");

CREATE UNIQUE INDEX IF NOT EXISTS "social_accounts_platform_user_id_uniq"
  ON "social_accounts" ("platform", "platform_user_id");
