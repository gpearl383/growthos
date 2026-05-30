-- Per-tenant encrypted API keys so users can configure providers in-app
-- instead of editing environment variables.

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
