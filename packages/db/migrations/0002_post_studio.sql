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
