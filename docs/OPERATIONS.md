# GrowthOS — Operations Runbook

> The single source of truth for **what is deployed where, with what config, and how to operate it**. Live infrastructure, environment variables, integrations, common workflows, and known gotchas. Update this file when anything below changes.
>
> Companion docs:
> - [`CODE_AUDIT_2026-05-31.md`](./CODE_AUDIT_2026-05-31.md) — most recent code review, open findings by severity, what's been fixed
> - [`GROWTHOS_REBUILD_SPEC.md`](./GROWTHOS_REBUILD_SPEC.md) — full architectural spec (the "how it was built")
> - [`GROWTHOS_EXECUTIVE_SUMMARY.md`](./GROWTHOS_EXECUTIVE_SUMMARY.md) — product / business overview
> - `CLAUDE.md` / `AGENTS.md` at repo root — AI agent memory pointing at this file

---

## 1. Live infrastructure (the URLs you actually care about)

| Concern | URL / ID | Notes |
|---|---|---|
| **Production app** | https://growthos-blond.vercel.app | Primary alias |
| **Production app (alt)** | https://growthos.vercel.app | Project default alias |
| **Branch alias (main)** | https://growthos-git-main-geoffrey-pearlmans-projects.vercel.app | Always points at latest `main` deploy |
| **Vercel dashboard** | https://vercel.com/geoffrey-pearlmans-projects/growthos | |
| **Vercel project ID** | `prj_rngqHqhqyk7XVY6IZ6TPTORGX0Gu` | |
| **Vercel team ID** | `team_5QemapEKyI9T7c1BuMB4XUUT` | Slug: `geoffrey-pearlmans-projects` |
| **Vercel Blob store** | `growthos-media` (`store_m9Ornm9zuMKzH5uS`, region `iad1`, access `public`) | All uploaded + AI-generated media. Public URLs at `m9ornm9zumkzh5us.public.blob.vercel-storage.com`. Dashboard: https://vercel.com/geoffrey-pearlmans-projects/~/stores/blob/store_m9Ornm9zuMKzH5uS |
| **GitHub repo** | https://github.com/gpearl383/growthos | Public, MIT licensed |
| **Default branch** | `main` | Push to `main` → auto-deploys to Vercel production |
| **Supabase project (prod)** | ref `igizzkhcwednwbhqztgh` | Region `aws-1-us-east-1`; **NOT visible to the Supabase MCP** (different org than the MCP token) — manage via dashboard or `psql` / `postgres-js` |
| **Supabase project (other, empty)** | ref `rbgdovtegoawrqpllppe` | Created during early setup, never used — safe to delete or ignore |
| **Clerk dashboard** | https://dashboard.clerk.com | Account `gpearl383@gmail.com` |
| **Clerk env** | Currently `pk_test_` keys (development instance) | Switching to `pk_live_` requires a custom domain — `vercel.app` rejects `pk_live` |

### Local development

| Concern | Value |
|---|---|
| **Repo path** | `~/Documents/growthos/` |
| **Dev server** | `pnpm dev` (Turborepo runs `next dev` for `@growthos/web` on `:3000`) |
| **Local DB** | PGlite, file-backed at `.data/growthos/` (git-ignored). Active when `USE_LOCAL_DB=1` or `DATABASE_URL` is unset. |
| **Local DB reset** | `pnpm db:reset` — archives current `.data/growthos`, re-runs all migrations from `packages/db/migrations/`. Refuses to touch a remote DB. |
| **Toggle onboarding flag for testing** | `node scripts/toggle-onboarding.mjs true \| false` — flips `tenants.onboarding_complete` for all local tenants. |

---

## 2. Environment variables

All env vars **must be declared in `turbo.json#globalEnv`** or Turborepo strips them during the Vercel build (this caused the "Clerk is not configured" amber banner before the fix).

### Required for the app to function at all

| Variable | Where set | Purpose |
|---|---|---|
| `DATABASE_URL` | Vercel (prod), `apps/web/.env.local` (local) | Postgres connection string. Prod uses Supabase pooler: `postgresql://postgres.igizzkhcwednwbhqztgh:<password>@aws-1-us-east-1.pooler.supabase.com:6543/postgres` |
| `USE_LOCAL_DB` | Only in local `.env.local` | Set to `1` to force PGlite in dev even if `DATABASE_URL` is set |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Vercel + local | Clerk publishable key. Must be `pk_test_…` for vercel.app domains. |
| `CLERK_SECRET_KEY` | Vercel + local | Clerk secret key, format `sk_test_…` |
| `CLERK_WEBHOOK_SECRET` | Vercel + local | Verifies `/api/webhooks/clerk` signatures |
| `TOKEN_ENCRYPTION_KEY` | Vercel + local | 32-byte hex key for AES-GCM (`tenant_secrets` table + OAuth tokens). Generate with `openssl rand -hex 32`. Code **throws in production** if missing. |
| `BLOB_READ_WRITE_TOKEN` | Vercel (auto-provisioned by Blob store link), local optional | Read/write token for the Vercel Blob store (`growthos-media`, `store_m9Ornm9zuMKzH5uS`, region `iad1`). Required for any media upload / AI-image / voiceover on Vercel because serverless functions can't write to disk. Locally, if unset, storage falls back to `.data/uploads/` on the filesystem. |
| `NEXT_PUBLIC_APP_URL` | Vercel + local | Public origin for absolute URLs (`https://growthos-blond.vercel.app` in prod, `http://localhost:3000` in dev) |

### Optional integration keys (graceful degrade if missing)

| Variable | Used by | Effect when missing |
|---|---|---|
| `ANTHROPIC_API_KEY` | `/api/ai/chat`, `/api/ai/generate-post` | AI captions + copilot disabled. Users can add their own per-tenant via `/settings/api-keys`. |
| `OPENAI_API_KEY` | `/api/ai/generate-image` | AI image generation disabled. Per-tenant override available. |
| `ELEVENLABS_API_KEY` | `/api/audio/generate-voiceover` | Voiceover generation disabled. Per-tenant override available. |
| `ELEVENLABS_VOICE_ID` | Same as above | Falls back to default voice. |
| `INNGEST_EVENT_KEY` + `INNGEST_SIGNING_KEY` | Background jobs (`publish-scheduled-post`, `notify-new-lead`) | Jobs are queued but never run; lead-created emits become no-ops in dev. |
| `RESEND_API_KEY` + `RESEND_FROM` | New-lead email notifications | Emails silently dropped. |
| `META_APP_ID` + `META_APP_SECRET` + `META_WEBHOOK_VERIFY_TOKEN` | Instagram/Facebook OAuth + webhooks at `/api/meta/*` | OAuth start route returns 503. |
| `TIKTOK_CLIENT_KEY` + `TIKTOK_CLIENT_SECRET` | TikTok OAuth + publish | OAuth route returns 503. |
| `CANVA_CLIENT_ID` + `CANVA_CLIENT_SECRET` | Canva Connect (design import) | Canva button hidden in Post Studio. |
| `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` | `/api/leads` rate limiter | Falls back to in-memory (single-instance, no real enforcement). **Must be set in prod** for distributed rate limiting. Provision via Vercel Marketplace → Upstash Redis. |

### Build-side env vars (Vercel)

| Variable | Status | Purpose |
|---|---|---|
| `VERCEL_FORCE_NO_BUILD_CACHE=1` | ✅ Set (Production + Preview) as of 2026-05-30 | Disables the build cache that has caused repeated 250 MB function-size failures (see §5). Adds ~30–60s per build. **Do not remove without understanding §5A.** |

### Where to view/edit on Vercel

https://vercel.com/geoffrey-pearlmans-projects/growthos/settings/environment-variables

Vercel masks values after save (shows `••••••••`) — this is expected behavior, not a bug. The value is still stored.

---

## 3. Integration status (Saturday May 30, 2026)

| Integration | Status | Notes |
|---|---|---|
| Clerk (auth + orgs) | ✅ Live | Test keys, modal sign-in, Google OAuth working |
| Supabase Postgres | ✅ Live | `igizzkhcwednwbhqztgh`, all 7 migrations applied |
| Vercel (hosting) | ✅ Live | Auto-deploys from `main`. Build cache gotcha — see §5 |
| GitHub | ✅ Live | `gpearl383/growthos` public repo |
| Anthropic AI | ⏳ Configurable per-tenant via `/settings/api-keys` | No global env key set |
| OpenAI Images | ⏳ Configurable per-tenant via `/settings/api-keys` | No global env key set |
| ElevenLabs | ⏳ Configurable per-tenant via `/settings/api-keys` | No global env key set |
| Inngest | ⏳ Not wired | Need account + `INNGEST_*` env vars; lead/post jobs no-op until then |
| Resend | ⏳ Not wired | Email notifications silently dropped |
| Meta (IG/FB) | ⏳ Not wired | Requires Meta App + App Review for `instagram_basic` / `pages_show_list` / `instagram_manage_comments` |
| TikTok | ⏳ Not wired | Requires TikTok Login Kit + Content Posting API approval |
| Canva Connect | ⏳ Not wired | Requires Canva developer app |
| Upstash Redis | ⏳ Not wired | Needed for distributed rate limiting on `/api/leads`. Falls back to in-memory until provisioned. Provision: Vercel dashboard → Storage → Create → Upstash Redis, then link to project. |

---

## 4. Runbook — common operations

### Push code → production

```bash
git add -A
git commit -m "what changed and why"
git push origin main
```

Vercel auto-builds and promotes to production on success. Watch:

- Inspector for the latest deploy: https://vercel.com/geoffrey-pearlmans-projects/growthos/deployments
- Or via CLI: `gh run watch` (if using GitHub Actions, currently we don't)

### Force a no-cache redeploy (one-off)

When a deploy fails with `Max serverless function size of 250 MB uncompressed reached`:

1. Open https://vercel.com/geoffrey-pearlmans-projects/growthos/deployments
2. `⋯` menu on the failed deploy → **Redeploy**
3. **Uncheck** "Use existing Build Cache"
4. **Redeploy**

This consistently succeeds. The cache restore is what pushes the bundle over.

### Force no-cache for all future builds

Add env var on Vercel: `VERCEL_FORCE_NO_BUILD_CACHE=1` (Production scope). Trade-off: +30–60s per build, zero size failures.

### Apply pending DB migrations to production Supabase

```bash
cd ~/Documents/growthos
DATABASE_URL='postgresql://postgres.igizzkhcwednwbhqztgh:<password>@aws-1-us-east-1.pooler.supabase.com:6543/postgres' \
  node scripts/apply-supabase-catchup.mjs
```

The script:
- Loads `scripts/supabase-catchup-migrations.sql` (idempotent superset of `packages/db/migrations/0001…0006`)
- Runs it as a single batch via `postgres-js`
- Prints final `tenants` columns + `public` tables list as confirmation

For *new* migrations going forward, append the SQL to `supabase-catchup-migrations.sql` (keep it idempotent — `IF NOT EXISTS` / `EXCEPTION WHEN duplicate_object`) and re-run the script.

### Reset local PGlite DB

```bash
pnpm db:reset
```

Archives current `.data/growthos/` (so you can roll back), re-creates the directory, replays all migrations in order. Refuses to run if `DATABASE_URL` points anywhere remote.

### Inspect production data

```bash
DATABASE_URL='postgresql://postgres.igizzkhcwednwbhqztgh:<password>@aws-1-us-east-1.pooler.supabase.com:6543/postgres' \
  node -e 'const sql = require("postgres")(process.env.DATABASE_URL, { prepare: false, ssl: "require" });
           sql`select id, slug, business_name, onboarding_complete, website_url, created_at from tenants order by created_at desc`.then(r => { console.log(r); sql.end(); });'
```

### Check Vercel build / runtime logs from CLI

Through the Vercel MCP (preferred):
- Build logs: `get_deployment_build_logs` with the deployment ID
- Runtime logs: `get_runtime_logs` with `projectId: growthos`, `teamId: team_5QemapEKyI9T7c1BuMB4XUUT`

### Toggle onboarding for testing the gated UI

```bash
node scripts/toggle-onboarding.mjs false  # locks UI back down (pre-onboarding state)
node scripts/toggle-onboarding.mjs true   # unlocks full UI
```

Local DB only — refuses remote.

---

## 5. Known issues + workarounds

### A. Vercel build cache pollution → 250 MB function size failures

**Symptom:** Build succeeds at compile time, then errors with:
```
Warning: Max serverless function size of 250 MB uncompressed reached
Serverless Function's page: analytics.js
apps/web/.next  278.97 MB
```

**Root cause:** Vercel restores `.next/cache` from prior deploys, and successive restores accumulate stale tracing artifacts. The `analytics.js` function (heaviest function due to importing `tenant.ts` + `analytics.ts` + Drizzle + Clerk) creeps over the 250 MB hard cap.

**Permanent fix:** Set `VERCEL_FORCE_NO_BUILD_CACHE=1` env var. **Already done** as of 2026-05-30 (Production + Preview).

**One-off fix:** Dashboard → failed deploy → Redeploy with cache box unchecked.

**Not a fix:** Adding `outputFileTracingExcludes` for darwin/win32 binaries — pnpm only installs target-platform binaries on Vercel Linux, so those excludes are no-ops.

### B. Two tenants in production DB

Current state (May 30, 2026):

| ID | Slug | Notes |
|---|---|---|
| `810f765b-4a7f-4f11-a4b4-d57a610153bf` | `csm-integrated-solutions-1` | **Active.** Maps to your current Clerk org. |
| `833f9cb1-9688-4b26-9dc6-b5af73517251` | `csm-integrated-solutions` | Orphaned from an earlier sign-up. Safe to delete. |

Cleanup (when ready):
```sql
delete from tenants where id = '833f9cb1-9688-4b26-9dc6-b5af73517251';
```
ON DELETE CASCADE handles `lead_pages`, `posts`, `leads`, `events`, `social_accounts`, `tenant_secrets`, `media_assets`.

### C. "Continue setup" link shows for already-onboarded users (cosmetic)

It's hard-coded unconditionally inside `<SignedIn>` in `apps/web/app/layout.tsx`. We did this on purpose to avoid the bundle-size trap (see §5A). Clicking it bounces to `/get-started` → which immediately redirects to `/leads` if `onboardingComplete`, so it's a harmless no-op for onboarded users.

**Future fix:** Once `VERCEL_FORCE_NO_BUILD_CACHE=1` is set (giving headroom), restore the `OnboardingCtaShell` server component that conditionally renders based on `getOnboardingState()`.

### D. Media storage — Vercel Blob (cloud) vs filesystem (local dev)

`apps/web/lib/media/storage.ts` switches storage backends based on `BLOB_READ_WRITE_TOKEN`:

- **Token set** (Vercel production / preview, or local dev with the token pulled in): uses `@vercel/blob` `put()` and `del()`. URLs returned by `put()` live on `m9ornm9zumkzh5us.public.blob.vercel-storage.com`. Pathnames are tenant-scoped (`tenants/{tenantId}/{uuid}.ext`) so bulk cleanup by prefix is easy.
- **Token absent** (default `pnpm dev` flow): falls back to writing under `.data/uploads/{tenantId}/` and serving via `/api/media/file/{tenantId}/{filename}`. Identical to pre-Blob behavior.

The original filesystem-only implementation was the root cause of the May 30 "can't upload media" bug — Vercel serverless functions have a read-only filesystem (only `/tmp` is writable, and it's ephemeral + per-invocation). Four features were broken simultaneously: media upload, AI image gen, AI voiceover, and media-file serving. The Blob backend fixes all four at once.

**If you ever need to inspect / cleanup blobs:**
- List: `pnpm dlx vercel@latest blob list`
- Delete by URL: `pnpm dlx vercel@latest blob del <url>`
- Dashboard: https://vercel.com/geoffrey-pearlmans-projects/~/stores/blob/store_m9Ornm9zuMKzH5uS

### E. Pre-existing Clerk session can outlive a tenant deletion

If you `delete from tenants` for the tenant your Clerk session is logged into, the next request hits `getOrCreateTenant()` which **creates a new tenant** automatically using the Clerk org's name/slug. This is the intended self-healing behavior; just be aware it produces a new UUID.

---

## 6. Repo layout (high-level)

```
growthos/
├── apps/
│   └── web/                        Next.js 15 App Router (the entire user-facing app)
│       ├── app/                    Routes (page.tsx, layout.tsx, api/, settings/, …)
│       ├── components/             React (server + client)
│       ├── lib/                    Server-side helpers (tenant.ts, leads.ts, posts.ts, ai/, meta/, inngest/, …)
│       └── next.config.ts          PGlite excludes live here
├── packages/
│   ├── db/                         Drizzle schema + migrations + createDb()
│   │   ├── src/schema.ts           Source of truth for tables
│   │   └── migrations/             Numbered .sql files; 0000_init → 0006_tenant_website_url
│   ├── ui/                         Shared React components
│   └── config/                     Shared ESLint / TS config
├── scripts/                        Operational helpers
│   ├── apply-supabase-catchup.mjs  Apply all migrations to remote DB
│   ├── supabase-catchup-migrations.sql  Idempotent concatenation of 0001→0006
│   ├── db-reset.mjs                Wipe + re-init local PGlite
│   ├── db-check.mjs                Connectivity smoke test
│   ├── migrate.mjs                 `pnpm db:setup` entry point
│   ├── toggle-onboarding.mjs       Dev-only flag flipper
│   └── smoke.mjs                   Quick end-to-end test
├── docs/                           This folder
│   ├── OPERATIONS.md               You are here
│   ├── GROWTHOS_REBUILD_SPEC.md    Architecture deep-dive
│   ├── GROWTHOS_EXECUTIVE_SUMMARY.md  Business / product
│   └── …
├── CLAUDE.md                       Agent memory (this is what Claude auto-loads)
├── AGENTS.md                       Same for Codex / other agents
├── .cursor/rules/                  Cursor rules (auto-attached)
├── turbo.json                      globalEnv must list every server env var
└── package.json                    Workspace root; defines pnpm scripts
```

---

## 7. Quick reference — every URL in one place

### Live app pages
- Landing: https://growthos-blond.vercel.app
- Wizard: https://growthos-blond.vercel.app/get-started
- Leads inbox: https://growthos-blond.vercel.app/leads
- Create (Post Studio): https://growthos-blond.vercel.app/create
- Auto-replies: https://growthos-blond.vercel.app/auto-replies
- Analytics: https://growthos-blond.vercel.app/analytics
- Settings (brand): https://growthos-blond.vercel.app/settings/brand
- Settings (API keys): https://growthos-blond.vercel.app/settings/api-keys
- Public lead page (active tenant): https://growthos-blond.vercel.app/p/csm-integrated-solutions-1/offer

### Dashboards
- Vercel: https://vercel.com/geoffrey-pearlmans-projects/growthos
- Vercel env vars: https://vercel.com/geoffrey-pearlmans-projects/growthos/settings/environment-variables
- Vercel deployments: https://vercel.com/geoffrey-pearlmans-projects/growthos/deployments
- Supabase (prod): https://supabase.com/dashboard/project/igizzkhcwednwbhqztgh
- Supabase SQL editor (prod): https://supabase.com/dashboard/project/igizzkhcwednwbhqztgh/sql/new
- Clerk: https://dashboard.clerk.com
- GitHub: https://github.com/gpearl383/growthos
