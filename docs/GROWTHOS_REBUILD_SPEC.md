# GrowthOS — Full Rebuild Specification

> A complete, self-contained blueprint to recreate the **GrowthOS** app from scratch in another LLM or codebase. It documents the architecture, tech stack (with exact versions), database schema, every route/component/lib module, key flows, and a recommended build order.

---

## 1. What GrowthOS Is

GrowthOS is a **social media marketing app for small/local business owners** ("marketing without a marketing degree"). A single owner signs in, completes a short onboarding wizard, and gets:

- An **AI Post Studio** to create posts (upload media, AI-written copy + alt text, platform previews, inline AI copilot, schedule/publish to Instagram/Facebook/TikTok).
- A **Leads inbox** (capture + manage leads from a public lead page).
- **Auto-replies** for Instagram/Facebook comment & DM keywords.
- **Connections** to Meta (Instagram/Facebook) and TikTok via OAuth.
- A **public lead page** (`/p/{tenantSlug}/{pageSlug}`).
- An **AI helper chat** (floating, plain-English marketing advice).

It is **multi-tenant** (one tenant per Clerk organization), but runs fully in a **local POC mode** without any cloud services (embedded Postgres, local file storage, AI/OAuth all optional and degrade gracefully).

---

## 2. Tech Stack (exact versions)

| Layer | Choice | Version |
|-------|--------|---------|
| Runtime | Node.js | `>=20` |
| Package manager | pnpm | `9.15.9` |
| Monorepo | Turborepo | `^2.5.4` |
| Framework | Next.js (App Router) | `15.5.18` |
| React | React / React DOM | `19.1.0` |
| Language | TypeScript | `^5.8` |
| Styling | Tailwind CSS v4 (`@tailwindcss/postcss`) | `^4` |
| UI primitives | class-variance-authority `^0.7.1`, clsx `^2.1.1`, tailwind-merge `^3.3.0` | — |
| ORM | Drizzle ORM (pinned via pnpm override) | `0.44.7` |
| Local DB | PGlite (embedded WASM Postgres) | `^0.4.6` |
| Cloud DB driver | postgres.js `^3.4.9`, `@neondatabase/serverless` `^1.0.1` | — |
| Migrations tooling | drizzle-kit | `^0.31.1` |
| Auth | Clerk (`@clerk/nextjs`) | `^6.22.0` |
| AI SDK | `ai` `^6.0.192` + `@ai-sdk/anthropic` `^3.0.81` | — |
| Background jobs | Inngest | `^3.39.2` |
| Email | Resend | `^6.12.4` |
| Webhook verification | svix | `^1.69.0` |
| Validation | zod | `^3.25.67` |
| Tests | vitest | `^4.1.7` |

> **Critical detail:** `drizzle-orm` is pinned with a root `pnpm.overrides` entry to `0.44.7` to avoid duplicate-instance type conflicts. The web app imports Drizzle operators **from `@growthos/db`**, never directly from `drizzle-orm`.

---

## 3. Monorepo Structure

```
growthos/
├── package.json                # root scripts + pnpm overrides
├── pnpm-workspace.yaml          # packages: apps/*, packages/*
├── turbo.json                   # task pipeline
├── scripts/
│   ├── migrate.mjs              # `pnpm db:setup` — applies all SQL migrations (local or remote)
│   ├── db-check.mjs             # `pnpm db:check` — connectivity check
│   └── smoke.mjs                # smoke test
├── packages/
│   ├── config/                  # shared tsconfig bases (typescript/base.json, nextjs.json)
│   ├── db/                      # @growthos/db — Drizzle schema, client factory, migrations
│   └── ui/                      # @growthos/ui — Button, Card, cn() util
└── apps/
    └── web/                     # @growthos/web — Next.js app (everything user-facing)
```

### Package responsibilities

- **`@growthos/db`** — Drizzle schema (`src/schema.ts`), DB client factory + singleton (`src/index.ts`), local-DB path resolution (`src/local.ts`), SQL migrations (`migrations/*.sql`), `drizzle.config.ts`. Re-exports Drizzle operators (`and`, `asc`, `count`, `desc`, `eq`, `gte`, `isNotNull`, `lte`, `or`) so the app has a single Drizzle instance.
- **`@growthos/ui`** — minimal shadcn-style primitives: `./button`, `./card`, `./utils` (the `cn()` clsx+tailwind-merge helper).
- **`@growthos/config`** — TS config bases consumed by other packages.
- **`@growthos/web`** — the Next.js application.

---

## 4. Environment Variables

All optional except none are strictly required for local POC. Features detect their keys and degrade gracefully. See `apps/web/lib/env.ts` for the booleans (`clerkConfigured`, `dbConfigured`, `anthropicConfigured`, `resendConfigured`, `inngestConfigured`, `metaConfigured`, `tiktokConfigured`, `openaiConfigured`, `elevenlabsConfigured`, `canvaConfigured`, plus `useLocalDb`).

```bash
# Local POC database (default)
USE_LOCAL_DB=true                      # true=PGlite, false=use DATABASE_URL
# DATABASE_URL=postgresql://...        # cloud Postgres (Supabase/Neon) when USE_LOCAL_DB=false
# LOCAL_DATABASE_PATH=...              # override .data/growthos
# GROWTHOS_ROOT=...                    # override workspace-root detection

# Auth (Clerk) — optional; without it, dev uses org "dev_local_org"
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

# AI copy + vision + copilot
ANTHROPIC_API_KEY=

# Meta (Instagram/Facebook)
META_APP_ID=
META_APP_SECRET=
META_WEBHOOK_VERIFY_TOKEN=growthos-dev-verify

# TikTok
TIKTOK_CLIENT_KEY=
TIKTOK_CLIENT_SECRET=

# Post Studio Phase 2 (all optional)
OPENAI_API_KEY=                        # AI image generation (gpt-image-1)
ELEVENLABS_API_KEY=                    # voiceover TTS
ELEVENLABS_VOICE_ID=                   # defaults to "Rachel"
CANVA_CLIENT_ID=                       # Edit-in-Canva (Connect API, PKCE)
CANVA_CLIENT_SECRET=

# Background jobs / email
INNGEST_EVENT_KEY=
INNGEST_SIGNING_KEY=
RESEND_API_KEY=
RESEND_FROM=GrowthOS <hello@growthos.app>

# Token encryption (Meta/TikTok access tokens at rest)
TOKEN_ENC_KEY=                         # used by lib/meta/token-crypto.ts

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 5. Database

### 5.1 Local vs cloud selection (`packages/db/src/local.ts` + `src/index.ts`)

- `useLocalDatabase()` returns true if `USE_LOCAL_DB=true`, OR (`USE_LOCAL_DB!=false` AND no valid `DATABASE_URL` AND `NODE_ENV!=production`).
- Local DB file lives at `<workspaceRoot>/.data/growthos` (PGlite). `findWorkspaceRoot()` resolves the monorepo root relative to `packages/db/src/local.ts` (works regardless of `process.cwd()`), honoring `GROWTHOS_ROOT`.
- `createDb()` returns a Drizzle client. **Global singletons** (`globalThis.__growthosLocalClient` / `__growthosRemoteClient`) ensure exactly one PGlite/postgres.js client per process.
- Cloud mode uses postgres.js with `prepare:false` and `ssl:"require"` when the URL contains `supabase.com`.

> **Gotcha:** PGlite is single-process. Do NOT run `pnpm db:setup` while the dev server holds the DB open — stop the server, migrate, then restart, or the server's in-memory copy can overwrite migrated columns.

### 5.2 Next.js config requirement

`apps/web/next.config.ts` must externalize the DB packages from the server bundle, or PGlite breaks:

```ts
const nextConfig = {
  transpilePackages: ["@growthos/ui"],
  serverExternalPackages: ["@growthos/db", "@electric-sql/pglite", "postgres"],
};
```

### 5.3 Migrations (`packages/db/migrations/`)

`scripts/migrate.mjs` reads every `*.sql` file in sorted order and applies them (local via PGlite, remote via postgres.js), skipping any that error with "already exists" so re-runs are idempotent.

- `0000_init.sql` — all enums + base tables.
- `0001_add_tiktok_platform.sql` — `ALTER TYPE "platform" ADD VALUE IF NOT EXISTS 'tiktok';`
- `0002_post_studio.sql` — `media_asset_type` enum; `posts` columns `alt_text`, `media_type`, `audio_url`, `studio_metadata`; `media_assets` table + index.

### 5.4 Schema (Drizzle / `packages/db/src/schema.ts`)

**Enums**
- `tenant_goal`: bookings, quotes, email_list, store_visits, followers
- `tenant_plan`: trial, active, canceled
- `lead_page_template`: book, quote, guide
- `platform`: instagram, facebook, tiktok
- `media_asset_type`: image, video, audio
- `post_status`: draft, scheduled, published, failed, copied
- `social_account_status`: connected, expired, error
- `lead_status`: new, contacted, booked, won, lost, archived
- `event_type`: click, page_view, form_submit, booking, dm_sent

**Tables** (all ids `uuid` default random; `tenant_id` FK → `tenants.id` ON DELETE cascade; `created_at` timestamptz default now)

| Table | Columns (beyond id/tenant_id/created_at) |
|-------|------------------------------------------|
| `tenants` | `clerk_org_id` (unique), `slug` (unique), `business_type`, `business_name`, `goal` (enum), `offer_text`, `onboarding_complete` (bool, default false), `plan` (enum, default trial) |
| `brand_assets` | `logo_url`, `photo_urls` (jsonb string[]) |
| `lead_pages` | `template` (enum), `public_slug`, `content_json` (jsonb), `published` (bool); unique(tenant_id, public_slug) |
| `tracking_links` | `post_id` (uuid), `code`, `destination_url` |
| `posts` | `caption` (notNull), `hook`, `hashtags`, `media_url`, **`alt_text`**, **`media_type`** (enum), **`audio_url`**, **`studio_metadata`** (jsonb default {}), `platform` (enum, notNull), `status` (enum default draft), `scheduled_at`, `published_at`, `platform_post_id`, `tracking_link_id` (FK) |
| `media_assets` | `url` (notNull), `type` (media_asset_type, notNull), `filename`, `mime_type`, `alt_text`, `source` (text default 'upload'); index on tenant_id |
| `social_accounts` | `platform` (enum), `platform_user_id`, `access_token_enc`, `token_expires_at`, `status` (enum default connected), `last_error`, `updated_at` |
| `auto_reply_presets` | `preset_key`, `enabled` (bool default true), `keywords` (jsonb string[]), `message_template`, `updated_at`; unique(tenant_id, preset_key) |
| `leads` | `name` (notNull), `email`, `phone`, `source` (notNull), `status` (enum default new), `notes`, `tracking_link_id` (FK), `updated_at` |
| `events` | `type` (enum), `lead_id` (FK), `tracking_link_id` (FK), `metadata` (jsonb) |

**Relations:** `tenantsRelations` (many: brandAssets, leadPages, posts, socialAccounts, autoReplyPresets, leads, events, trackingLinks, mediaAssets); `leadsRelations`, `postsRelations`, `mediaAssetsRelations` (one → tenant, and tracking links where applicable).

---

## 6. App Routes (`apps/web/app/`)

### 6.1 Pages

| Route | File | Purpose |
|-------|------|---------|
| `/` | `app/page.tsx` | Marketing landing / dashboard entry; describes features incl. IG/FB/TikTok AI posts. |
| `/get-started` | `app/get-started/page.tsx` | Onboarding wizard host. Redirects here until `tenant.onboardingComplete`. |
| `/create` | `app/create/page.tsx` | **Post Studio** host (server component). Gathers tenant, drafts, media assets, brand photos, connection status, `configured` flags; supports `?resume={postId}`, `?saved=`, `?error=`, `?canva=` flash banners. |
| `/leads` | `app/leads/page.tsx` | Leads inbox. |
| `/auto-replies` | `app/auto-replies/page.tsx` | Manage IG/FB auto-reply presets. |
| `/settings/connections` | `app/settings/connections/page.tsx` | Connect/disconnect Meta + TikTok. |
| `/settings/account` | `app/settings/account/page.tsx` | Account/plan info. |
| `/p/[tenantSlug]/[pageSlug]` | public lead page (form capture). |
| `/sign-in`, `/sign-up` | Clerk catch-all auth pages. |

> **Pattern:** Page components must keep `redirect()` calls OUTSIDE the `try/catch` used for DB errors (Next.js `redirect()` throws `NEXT_REDIRECT`, which must not be swallowed as a "database error"). Show `<SetupError>` on real DB failures.

### 6.2 API routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/ai/chat` | POST | Streams AI helper / studio copilot reply (Anthropic) with `buildChatContext` + optional `studioContext`; plain-text fallback when no key. |
| `/api/ai/generate-post` | POST | Generate post content (delegates to `generatePostContent`). |
| `/api/ai/generate-image` | POST | OpenAI `gpt-image-1` → save to media library (gated on `OPENAI_API_KEY`). |
| `/api/audio/generate-voiceover` | POST | ElevenLabs TTS → MP3 saved as audio asset (gated on `ELEVENLABS_API_KEY`). |
| `/api/media/upload` | POST | Multipart upload → local file storage + `media_assets` row. |
| `/api/media/file/[tenantId]/[filename]` | GET | Serves locally-stored media (path-traversal guarded, content-type by extension). |
| `/api/canva/oauth/start` | GET | Canva Connect OAuth w/ PKCE; sets verifier+state cookies; redirects to Canva. |
| `/api/canva/oauth/callback` | GET | Validates state+verifier, exchanges code, stores `canva_access_token` cookie, redirects `/create?canva=connected`. |
| `/api/canva/designs/create` | POST | Creates a platform-sized Canva design, returns `editUrl`; 401 `{needsAuth}` when not connected. |
| `/api/meta/oauth/start` + `/callback` | GET | Meta (IG/FB) OAuth → upsert social account. |
| `/api/tiktok/oauth/start` + `/callback` | GET | TikTok OAuth → upsert social account. |
| `/api/webhooks/meta` | GET/POST | Meta webhook verify (`hub.challenge`) + inbound comment/DM events → auto-reply matching. |
| `/api/webhooks/clerk` | POST | Clerk org sync (svix-verified) → `syncTenantFromClerkOrg`. |
| `/api/leads` | POST | Public lead capture from lead page. |
| `/api/inngest` | GET/POST/PUT | Inngest serve endpoint (registers functions). |

### 6.3 Server Actions (`apps/web/app/actions/`)

- `posts.ts` — `generatePost` (useActionState; reads platform/photoDescription/mediaUrl/mediaType → returns hook/caption/hashtags/altText), `saveGeneratedPost`, `scheduleGeneratedPost` (persist altText/mediaType/audioUrl, redirect with flash), `copyPostDraft` (marks copied, returns formatted text).
- `onboarding.ts` — completes wizard: writes tenant fields, brand assets, lead page, seeds auto-reply presets.
- `leads.ts` — update lead status/notes.
- `auto-replies.ts` — toggle/update presets.
- `social-accounts.ts` — disconnect a platform (validates against `SOCIAL_PLATFORMS`).

---

## 7. Components (`apps/web/components/`)

### Post Studio (the centerpiece — `components/create/`)
- **`post-studio.tsx`** — client orchestrator. Owns all draft state (platform, mediaUrl, mediaType, hook, caption, hashtags, altText, audioUrl, photoDescription, scheduledAt, assets). Renders layout: left column = MediaPanel + CopyPanel + Actions card (generate via `useActionState`, save, copy, schedule forms with hidden inputs); right column = PlatformPreview + StudioTools + StudioCopilot. Handles upload fetch, asset selection, AI-image/voiceover callbacks. Accepts `initialDraft` for resume (keyed to remount).
- **`media-panel.tsx`** — upload button (hidden file input), asset thumbnail grid (image/video), selection highlight, empty state.
- **`copy-panel.tsx`** — platform `<select>`, hook input, caption textarea, hashtags input, **alt text** textarea; controlled via `onChange(field, value)`.
- **`platform-preview.tsx`** — static social mockup frame (avatar + business name, media in platform aspect ratio, caption, hashtags). Aspect: IG 1:1, FB 4:5, TikTok 9:16.
- **`studio-tools.tsx`** — "Enhance" card: Generate-image (OpenAI), Add-voiceover (ElevenLabs, with `<audio>` preview), Edit-in-Canva. Each gated by `configured` flags with setup hints; Canva 401 redirects to OAuth start.
- **`studio-copilot.tsx`** — wraps `AiHelperChat variant="embedded"` with studio starters ("Make the hook stronger", "Shorten the caption", "Suggest alt text", "Give me a TikTok version") and live `studioContext`.
- **`studio.ts`** — shared types/consts: `StudioAsset`, `PLATFORM_ASPECT`, `PLATFORM_LABEL`.
- **`drafts-list.tsx`** — saved drafts with thumbnail + status + "Resume in studio" link (`/create?resume={id}`); highlights the active resumed draft.

### AI helper (`components/ai-helper/`)
- **`chat.tsx`** — dual-mode chat. `variant="floating"` = fixed FAB bottom-right (auto-hides on `/create` via `usePathname`); `variant="embedded"` = inline card always open. Posts to `/api/ai/chat` with messages + optional `studioContext`. Props: `variant`, `studioContext`, `starters`, `greeting`.
- **`shell.tsx`** — server component; renders floating `AiHelperChat` only when DB configured + onboarding complete.

### Other
- `app-nav.tsx`, `app-nav-shell.tsx` — top navigation.
- `get-started/wizard.tsx` — multi-step onboarding form (business type, goal, offer, photos) → calls onboarding action.
- `leads/inbox.tsx` — leads table with status controls.
- `auto-replies/preset-list.tsx` — preset toggles/editors.
- `settings/connections-panel.tsx` — Meta + TikTok connect cards, setup checklist, disconnect.
- `flash-banner.tsx` — success/error banner (`variant`).
- `setup-error.tsx` — friendly DB/config error card.
- `placeholder-page.tsx` — generic stub.

### UI primitives (`packages/ui/src/components/`)
- `button.tsx` — `cva` variants: default (emerald), secondary, outline, ghost; sizes default/sm/lg.
- `card.tsx` — Card, CardHeader, CardTitle, CardDescription, CardContent.
- `lib/utils.ts` — `cn()` = `twMerge(clsx(...))`.

---

## 8. Lib Modules (`apps/web/lib/`)

| Module | Responsibility |
|--------|----------------|
| `env.ts` | Server feature-flag booleans + `appUrl()`, `metaWebhookVerifyToken()`, `resendFromAddress()`. |
| `env-client.ts` | Client-safe env exposure. |
| `db.ts` | `getDb()` — memoized `createDb()` guarded by `dbConfigured`. |
| `tenant.ts` | `getAuthOrgId()` (Clerk or `dev_local_org`), `getOrCreateTenant()`, `getTenantForOrg()`, `syncTenantFromClerkOrg()`, unique slug logic. |
| `platforms.ts` | `SOCIAL_PLATFORMS` const + `SocialPlatform` type + `platformLabel()`. |
| `ai/generate-post.ts` | `generatePostContent()` — Anthropic structured output (zod) for hook/caption/hashtags/facebookCaption/**altText**; uses **vision** on uploaded image (`loadImagePart` fetches bytes); `buildFallbackPost()` template when no key; `formatPostForCopy()` per platform. |
| `ai/chat-context.ts` | `buildChatContext()` (lead/post stats) + `buildChatSystemPrompt(context, studio?)` with studio-aware prompt. |
| `posts.ts` | CRUD: `listPostsForTenant`, `savePostDraft`, `schedulePost`, `listDueScheduledPosts`, `markPostPublished/Failed/Copied`, `formatPostStatus`. All persist altText/mediaType/audioUrl. |
| `media/storage.ts` | `saveMediaBuffer()`, `saveUploadedFile()`, `mediaTypeFromMime()`, `getMediaFilePath()` (traversal-safe), `mediaFileUrl()`. Stores under `<root>/.data/uploads/{tenantId}/`. |
| `media/assets.ts` | `listMediaAssetsForTenant()`, `createMediaAsset()`. |
| `media/types.ts` | `MediaType = image|video|audio`. |
| `openai/images.ts` | `generateImage(prompt)` → `{buffer, mimeType}` via OpenAI images API. |
| `elevenlabs/voiceover.ts` | `generateVoiceover(text)` → MP3 buffer (default voice "Rachel"). |
| `canva/config.ts` | PKCE pair, OAuth URL, code exchange (Basic auth), `createCanvaDesign()`, `PLATFORM_CANVAS_SIZE`. |
| `oauth/state.ts` | `createSignedOAuthState()` / `parseSignedOAuthState()` (HMAC-signed, 15-min TTL). Shared by Meta/TikTok/Canva. |
| `meta/config.ts` | Meta Graph OAuth + `graphRequest()`. |
| `meta/publish.ts` | `publishPostToMeta()` (IG media container+publish; FB feed). |
| `meta/webhooks.ts`, `meta/auto-reply-matching.ts` | Inbound webhook handling + keyword matching. |
| `meta/token-crypto.ts` | Encrypt/decrypt access tokens at rest (`TOKEN_ENC_KEY`). |
| `tiktok/config.ts` | TikTok OAuth + `tiktokApiRequest()` + user fetch. |
| `tiktok/publish.ts` | `publishPostToTikTok()` (video init `PULL_FROM_URL`). |
| `social/publish.ts` | `publishPost(post)` router → Meta or TikTok by `post.platform`. |
| `social-accounts.ts` | `listSocialAccountsForTenant`, `getSocialAccountForTenant`, `upsertSocialAccount`, `disconnectSocialAccount`, `getAccessToken`. |
| `leads.ts` | Lead helpers + `formatLeadSource` (incl. tiktok). |
| `lead-pages.ts` | Public lead page content/render helpers. |
| `auto-replies.ts` | Preset CRUD + matching helpers. |
| `onboarding/constants.ts` | BUSINESS_TYPES, GOAL_OPTIONS, `goalToTemplate()`, `buildLeadPageContent()`, `buildAutoReplyPresets()`. |
| `notifications/email.ts` | Resend new-lead email. |
| `slug.ts` | `slugify`, `uniqueSlug`. |
| `inngest/client.ts` + `functions/*` | `notify-new-lead`, `publish-scheduled-post` (cron `*/5 * * * *` → `publishPost`), `hello-world`. |

---

## 9. Key Flows

### 9.1 Onboarding
`/get-started` wizard → `actions/onboarding.ts` writes tenant (businessType/goal/offer), `brand_assets` (photo URLs), creates a `lead_page` from `goalToTemplate` + `buildLeadPageContent`, seeds `auto_reply_presets` via `buildAutoReplyPresets`, sets `onboarding_complete=true`, redirects to `/leads` (or `/create`).

### 9.2 Post Studio (create → publish)
1. Upload media (`/api/media/upload`) → `media_assets` row → served at `/api/media/file/...`.
2. "Generate copy with AI" → `generatePost` action → `generatePostContent` (vision on the selected image) → fills hook/caption/hashtags/altText.
3. Inline copilot refines via `/api/ai/chat` with `studioContext`.
4. Save draft / Copy / Schedule (server actions persist all fields). Phase-2 tools: AI image, voiceover, Edit-in-Canva.
5. Cron Inngest `publish-scheduled-post` runs every 5 min → `listDueScheduledPosts` → `publishPost` (Meta/TikTok) → mark published/failed.

### 9.3 OAuth (Meta / TikTok / Canva)
Signed state (HMAC) on start; callback validates state, exchanges code, upserts `social_accounts` (Meta/TikTok, token encrypted) or stores Canva token in an httpOnly cookie. Canva additionally uses **PKCE** (verifier/challenge cookies).

### 9.4 Leads + auto-replies
Public lead page form → `/api/leads` inserts a lead + event → Inngest `notify-new-lead` emails the owner (Resend). Meta webhook inbound comment/DM → keyword match against presets → auto-reply with lead-page link.

---

## 10. Config Files

- **`turbo.json`** — pipeline for dev/build/lint/typecheck/test.
- **`apps/web/middleware.ts`** — Clerk middleware when configured (public routes: `/`, `/sign-in`, `/sign-up`, `/p/*`, `/api/inngest`, `/api/leads`, `/api/webhooks/*`); pass-through `NextResponse.next()` when Clerk not configured.
- **`apps/web/next.config.ts`** — `transpilePackages` + `serverExternalPackages` (see §5.2).
- **`apps/web/postcss.config.mjs`** — Tailwind v4 via `@tailwindcss/postcss`.
- **`apps/web/app/globals.css`** — Tailwind v4 `@import` + theme.
- **`apps/web/eslint.config.mjs`** — `eslint-config-next`.
- **`packages/db/drizzle.config.ts`** — drizzle-kit config (schema path, migrations dir, dialect postgres).
- **`packages/config/typescript/{base,nextjs}.json`** — shared TS bases.

---

## 11. Root Scripts

```jsonc
"dev":        "turbo dev",
"build":      "turbo build",
"lint":       "turbo lint",
"typecheck":  "turbo typecheck",
"test":       "pnpm --filter @growthos/web test",
"smoke":      "node scripts/smoke.mjs",
"db:setup":   "node scripts/migrate.mjs",   // apply all migrations (local or remote)
"db:check":   "node scripts/db-check.mjs",
"db:generate":"pnpm --filter @growthos/db generate",
"db:migrate": "pnpm --filter @growthos/db migrate",
"db:studio":  "pnpm --filter @growthos/db studio"
```

`pnpm.overrides`: `{ "drizzle-orm": "0.44.7" }`.

---

## 12. Setup & Run (from scratch)

```bash
pnpm install
cp apps/web/.env.local.example apps/web/.env.local   # USE_LOCAL_DB=true by default
pnpm db:setup                                         # creates .data/growthos + applies migrations
pnpm --filter @growthos/web dev                       # http://localhost:3000
```

Add `ANTHROPIC_API_KEY` for AI copy/vision/copilot; everything else is optional and shows setup hints until configured.

---

## 13. Recommended Build Order (for an LLM recreating this)

1. **Scaffold monorepo**: pnpm workspace, turbo, `packages/config`, `packages/ui` (Button/Card/cn), `packages/db` skeleton. Add `pnpm.overrides` for drizzle-orm.
2. **DB package**: write `schema.ts` (§5.4), `local.ts` (root detection + path), `index.ts` (singleton `createDb` + operator re-exports), `migrations/0000_init.sql`. Write `scripts/migrate.mjs` (multi-file, idempotent).
3. **Next.js app**: `next.config.ts` (externalize DB), `middleware.ts`, layout, globals.css, `lib/env.ts`, `lib/db.ts`, `lib/tenant.ts`, `lib/platforms.ts`.
4. **Onboarding**: constants, wizard, onboarding action, lead page render.
5. **Leads + auto-replies**: schema already present; pages, actions, inbox, presets, `/api/leads`, email notification, Inngest `notify-new-lead`.
6. **AI**: `ai/generate-post.ts` (+ vision + altText), `ai/chat-context.ts`, `/api/ai/chat`, `AiHelperChat` (floating).
7. **Social connect + publish**: Meta/TikTok config + OAuth routes + `social-accounts.ts` + `social/publish.ts` + token-crypto + Inngest `publish-scheduled-post`.
8. **Post Studio (Phase 1)**: `0002_post_studio.sql`, media storage + assets + upload/serve routes, `post-studio.tsx` and panels, wire `posts` actions for media/altText, embedded copilot + hide floating FAB on `/create`, resumable drafts.
9. **Post Studio (Phase 2)**: OpenAI image route + lib, ElevenLabs voiceover route + lib, Canva PKCE OAuth + design-create route, `studio-tools.tsx` (all gated by env flags).
10. **Polish**: flash banners, setup-error states, settings pages, tests (vitest), smoke script.

---

## 14. Design Principles to Preserve

- **Graceful degradation:** every external integration checks its env flag and shows a setup hint / fallback instead of crashing.
- **Plain-English UX:** no marketing jargon anywhere in copy.
- **Single Drizzle instance:** import operators from `@growthos/db`, keep the pnpm override.
- **Redirect safety:** never wrap Next.js `redirect()` inside DB `try/catch`.
- **Local-first POC:** no cloud dependency required to run; PGlite + local file storage; production swaps in `DATABASE_URL` + (future) Vercel Blob.
- **Delegate, don't rebuild:** visual editing → Canva; image gen → OpenAI; audio → ElevenLabs. Don't build in-app editors.
```
