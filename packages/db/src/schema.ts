import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const tenantGoalEnum = pgEnum("tenant_goal", [
  "bookings",
  "quotes",
  "email_list",
  "store_visits",
  "followers",
]);

export const tenantPlanEnum = pgEnum("tenant_plan", [
  "trial",
  "active",
  "canceled",
]);

export const leadPageTemplateEnum = pgEnum("lead_page_template", [
  "book",
  "quote",
  "guide",
]);

export const platformEnum = pgEnum("platform", ["instagram", "facebook", "tiktok"]);

export const mediaAssetTypeEnum = pgEnum("media_asset_type", [
  "image",
  "video",
  "audio",
]);

export const secretProviderEnum = pgEnum("secret_provider", [
  "anthropic",
  "openai",
  "elevenlabs",
]);

export const postStatusEnum = pgEnum("post_status", [
  "draft",
  "scheduled",
  "publishing",
  "published",
  "failed",
  "copied",
]);

export const socialAccountStatusEnum = pgEnum("social_account_status", [
  "connected",
  "expired",
  "error",
]);

export const leadStatusEnum = pgEnum("lead_status", [
  "new",
  "contacted",
  "booked",
  "won",
  "lost",
  "archived",
]);

export const eventTypeEnum = pgEnum("event_type", [
  "click",
  "page_view",
  "form_submit",
  "booking",
  "dm_sent",
]);

export const tenants = pgTable("tenants", {
  id: uuid("id").defaultRandom().primaryKey(),
  clerkOrgId: text("clerk_org_id").notNull().unique(),
  slug: text("slug").notNull().unique(),
  businessType: text("business_type"),
  businessName: text("business_name"),
  goal: tenantGoalEnum("goal"),
  offerText: text("offer_text"),
  websiteUrl: text("website_url"),
  onboardingComplete: boolean("onboarding_complete").default(false).notNull(),
  plan: tenantPlanEnum("plan").default("trial").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const brandAssets = pgTable("brand_assets", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  logoUrl: text("logo_url"),
  photoUrls: jsonb("photo_urls").$type<string[]>().default([]),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const leadPages = pgTable("lead_pages", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  template: leadPageTemplateEnum("template").notNull(),
  publicSlug: text("public_slug").notNull(),
  contentJson: jsonb("content_json")
    .$type<Record<string, unknown>>()
    .default({}),
  published: boolean("published").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const trackingLinks = pgTable("tracking_links", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  postId: uuid("post_id"),
  code: text("code").notNull(),
  destinationUrl: text("destination_url").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const posts = pgTable("posts", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  caption: text("caption").notNull(),
  hook: text("hook"),
  hashtags: text("hashtags"),
  mediaUrl: text("media_url"),
  altText: text("alt_text"),
  mediaType: mediaAssetTypeEnum("media_type"),
  audioUrl: text("audio_url"),
  studioMetadata: jsonb("studio_metadata")
    .$type<Record<string, unknown>>()
    .default({}),
  platform: platformEnum("platform").notNull(),
  status: postStatusEnum("status").default("draft").notNull(),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  platformPostId: text("platform_post_id"),
  trackingLinkId: uuid("tracking_link_id").references(() => trackingLinks.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
}, (table) => [
  index("posts_tenant_id_idx").on(table.tenantId),
  index("posts_tenant_status_idx").on(table.tenantId, table.status),
  index("posts_scheduled_at_idx").on(table.scheduledAt),
]);

export const mediaAssets = pgTable("media_assets", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  type: mediaAssetTypeEnum("type").notNull(),
  filename: text("filename"),
  mimeType: text("mime_type"),
  altText: text("alt_text"),
  source: text("source").default("upload").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const tenantSecrets = pgTable(
  "tenant_secrets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    provider: secretProviderEnum("provider").notNull(),
    valueEnc: text("value_enc").notNull(),
    last4: text("last4"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("tenant_secrets_tenant_provider_idx").on(
      table.tenantId,
      table.provider,
    ),
  ],
);

export const socialAccounts = pgTable("social_accounts", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  platform: platformEnum("platform").notNull(),
  platformUserId: text("platform_user_id").notNull(),
  accessTokenEnc: text("access_token_enc").notNull(),
  tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }),
  status: socialAccountStatusEnum("status").default("connected").notNull(),
  lastError: text("last_error"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
}, (table) => [
  index("social_accounts_tenant_id_idx").on(table.tenantId),
  index("social_accounts_tenant_platform_idx").on(table.tenantId, table.platform),
  index("social_accounts_platform_user_id_idx").on(table.platformUserId),
]);

export const autoReplyPresets = pgTable("auto_reply_presets", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  presetKey: text("preset_key").notNull(),
  enabled: boolean("enabled").default(true).notNull(),
  keywords: jsonb("keywords").$type<string[]>().default([]),
  messageTemplate: text("message_template").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const leads = pgTable("leads", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  source: text("source").notNull(),
  status: leadStatusEnum("status").default("new").notNull(),
  notes: text("notes"),
  trackingLinkId: uuid("tracking_link_id").references(() => trackingLinks.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
}, (table) => [index("leads_tenant_id_idx").on(table.tenantId)]);

export const events = pgTable("events", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  type: eventTypeEnum("type").notNull(),
  leadId: uuid("lead_id").references(() => leads.id),
  trackingLinkId: uuid("tracking_link_id").references(() => trackingLinks.id),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
}, (table) => [
  index("events_tenant_id_idx").on(table.tenantId),
  index("events_lead_id_idx").on(table.leadId),
]);

export const tenantsRelations = relations(tenants, ({ many }) => ({
  brandAssets: many(brandAssets),
  leadPages: many(leadPages),
  posts: many(posts),
  socialAccounts: many(socialAccounts),
  autoReplyPresets: many(autoReplyPresets),
  leads: many(leads),
  events: many(events),
  trackingLinks: many(trackingLinks),
  mediaAssets: many(mediaAssets),
}));

export const mediaAssetsRelations = relations(mediaAssets, ({ one }) => ({
  tenant: one(tenants, {
    fields: [mediaAssets.tenantId],
    references: [tenants.id],
  }),
}));

export const leadsRelations = relations(leads, ({ one }) => ({
  tenant: one(tenants, {
    fields: [leads.tenantId],
    references: [tenants.id],
  }),
  trackingLink: one(trackingLinks, {
    fields: [leads.trackingLinkId],
    references: [trackingLinks.id],
  }),
}));

export const postsRelations = relations(posts, ({ one }) => ({
  tenant: one(tenants, {
    fields: [posts.tenantId],
    references: [tenants.id],
  }),
  trackingLink: one(trackingLinks, {
    fields: [posts.trackingLinkId],
    references: [trackingLinks.id],
  }),
}));
