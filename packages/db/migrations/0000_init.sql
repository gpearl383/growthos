CREATE TYPE "tenant_goal" AS ENUM ('bookings', 'quotes', 'email_list', 'store_visits', 'followers');
CREATE TYPE "tenant_plan" AS ENUM ('trial', 'active', 'canceled');
CREATE TYPE "lead_page_template" AS ENUM ('book', 'quote', 'guide');
CREATE TYPE "platform" AS ENUM ('instagram', 'facebook', 'tiktok');
CREATE TYPE "post_status" AS ENUM ('draft', 'scheduled', 'published', 'failed', 'copied');
CREATE TYPE "social_account_status" AS ENUM ('connected', 'expired', 'error');
CREATE TYPE "lead_status" AS ENUM ('new', 'contacted', 'booked', 'won', 'lost', 'archived');
CREATE TYPE "event_type" AS ENUM ('click', 'page_view', 'form_submit', 'booking', 'dm_sent');

CREATE TABLE "tenants" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "clerk_org_id" text NOT NULL,
  "slug" text NOT NULL,
  "business_type" text,
  "business_name" text,
  "goal" "tenant_goal",
  "offer_text" text,
  "onboarding_complete" boolean DEFAULT false NOT NULL,
  "plan" "tenant_plan" DEFAULT 'trial' NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "tenants_clerk_org_id_unique" UNIQUE("clerk_org_id"),
  CONSTRAINT "tenants_slug_unique" UNIQUE("slug")
);

CREATE TABLE "brand_assets" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE cascade,
  "logo_url" text,
  "photo_urls" jsonb DEFAULT '[]'::jsonb,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE "lead_pages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE cascade,
  "template" "lead_page_template" NOT NULL,
  "public_slug" text NOT NULL,
  "content_json" jsonb DEFAULT '{}'::jsonb,
  "published" boolean DEFAULT false NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "lead_pages_tenant_public_slug_unique" UNIQUE("tenant_id", "public_slug")
);

CREATE TABLE "tracking_links" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE cascade,
  "post_id" uuid,
  "code" text NOT NULL,
  "destination_url" text NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE "posts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE cascade,
  "caption" text NOT NULL,
  "hook" text,
  "hashtags" text,
  "media_url" text,
  "platform" "platform" NOT NULL,
  "status" "post_status" DEFAULT 'draft' NOT NULL,
  "scheduled_at" timestamptz,
  "published_at" timestamptz,
  "platform_post_id" text,
  "tracking_link_id" uuid REFERENCES "tracking_links"("id"),
  "created_at" timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE "social_accounts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE cascade,
  "platform" "platform" NOT NULL,
  "platform_user_id" text NOT NULL,
  "access_token_enc" text NOT NULL,
  "token_expires_at" timestamptz,
  "status" "social_account_status" DEFAULT 'connected' NOT NULL,
  "last_error" text,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE "auto_reply_presets" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE cascade,
  "preset_key" text NOT NULL,
  "enabled" boolean DEFAULT true NOT NULL,
  "keywords" jsonb DEFAULT '[]'::jsonb,
  "message_template" text NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "auto_reply_presets_tenant_key_unique" UNIQUE("tenant_id", "preset_key")
);

CREATE TABLE "leads" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE cascade,
  "name" text NOT NULL,
  "email" text,
  "phone" text,
  "source" text NOT NULL,
  "status" "lead_status" DEFAULT 'new' NOT NULL,
  "notes" text,
  "tracking_link_id" uuid REFERENCES "tracking_links"("id"),
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE "events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE cascade,
  "type" "event_type" NOT NULL,
  "lead_id" uuid REFERENCES "leads"("id"),
  "tracking_link_id" uuid REFERENCES "tracking_links"("id"),
  "metadata" jsonb DEFAULT '{}'::jsonb,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX "brand_assets_tenant_id_idx" ON "brand_assets" ("tenant_id");
CREATE INDEX "lead_pages_tenant_id_idx" ON "lead_pages" ("tenant_id");
CREATE INDEX "leads_tenant_id_idx" ON "leads" ("tenant_id");
CREATE INDEX "auto_reply_presets_tenant_id_idx" ON "auto_reply_presets" ("tenant_id");
