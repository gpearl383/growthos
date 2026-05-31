# GrowthOS — Agent Memory

> Auto-loaded on every Claude / Cursor / Codex session in this repo. Keep this file short and high-signal. For full operational detail, read **[`docs/OPERATIONS.md`](./docs/OPERATIONS.md)** — that's the source of truth.

## What this project is

GrowthOS is an owner-first social-media marketing app for small business owners. Multi-tenant Next.js 15 (App Router) on Vercel, Clerk for auth, Supabase Postgres in production (PGlite locally), Drizzle ORM. Monorepo via pnpm + Turborepo.

Currently deployed and live at **https://growthos-blond.vercel.app**.

## Critical infrastructure

| | |
|---|---|
| GitHub | `gpearl383/growthos` (public, MIT) |
| Vercel project | `growthos` in team `team_5QemapEKyI9T7c1BuMB4XUUT` (`geoffrey-pearlmans-projects`) |
| Supabase prod | project ref `igizzkhcwednwbhqztgh`, region `aws-1-us-east-1` |
| Clerk | test instance (`pk_test_…`), Google OAuth + Organizations enabled |
| Local DB | PGlite, file-backed at `.data/growthos/` (git-ignored) |

## Critical workflows

```bash
pnpm dev                                    # local dev (Next.js + Turborepo)
pnpm db:reset                               # wipe + reinit local PGlite
pnpm typecheck                              # tsc across workspace
git push origin main                        # auto-deploys to Vercel prod

# Apply pending migrations to production Supabase:
DATABASE_URL='postgresql://postgres.igizzkhcwednwbhqztgh:<pwd>@aws-1-us-east-1.pooler.supabase.com:6543/postgres' \
  node scripts/apply-supabase-catchup.mjs
```

## Critical gotchas — read before changing anything in the layout or shared lib/

### 1. Vercel 250 MB function-size cliff

The `analytics.js` serverless function sits ~5 MB under Vercel's hard 250 MB per-function limit. Build cache restores accumulate stale tracing artifacts and push it over.

- **`VERCEL_FORCE_NO_BUILD_CACHE=1` is set on Production + Preview** as a permanent guard (since 2026-05-30). Do not remove it.
- If a deploy fails with `Max serverless function size of 250 MB uncompressed reached`, do **Vercel dashboard → failed deploy → Redeploy without build cache**. This consistently succeeds.
- **DO NOT** add direct `@clerk/nextjs/server` imports to `apps/web/app/page.tsx` or any widely-traced shared file unless cache is disabled — this has broken three deploys.
- `outputFileTracingExcludes` for darwin/win32 binaries is a no-op (Vercel only installs Linux binaries).

### 2. Environment variables must be in `turbo.json#globalEnv`

Turborepo aggressively filters env vars before passing them to tasks. Any non-`NEXT_PUBLIC_*` env var consumed at build time **must** be added to `turbo.json`'s `globalEnv` array, otherwise prerender evaluates `clerkConfigured` / `dbConfigured` as `false` and ships the wrong static HTML (e.g. amber "Clerk is not configured" banner).

### 3. PGlite is local-dev only — never let it land in a production bundle

`packages/db/src/index.ts` uses `eval("require")` to load PGlite dynamically so NFT can't statically trace it. `apps/web/next.config.ts` also lists it in `outputFileTracingExcludes` as a belt-and-suspenders. Don't undo either without re-verifying the bundle.

### 4. Migrations are not auto-applied to remote DBs

Drizzle migrations only run automatically against PGlite via `pnpm db:setup` / `pnpm db:reset`. Production Supabase migrations are run **manually** via `scripts/apply-supabase-catchup.mjs`. When you add a new migration file in `packages/db/migrations/`, also append the SQL to `scripts/supabase-catchup-migrations.sql` (idempotent — `IF NOT EXISTS` / `EXCEPTION WHEN duplicate_object`).

### 5. The current production Supabase is NOT visible to the Supabase MCP

The active project (`igizzkhcwednwbhqztgh`) is in a Supabase org the connected MCP token doesn't have access to. To inspect / modify it, use one of:
- Supabase dashboard SQL editor: https://supabase.com/dashboard/project/igizzkhcwednwbhqztgh/sql/new
- `psql` (if installed) with `DATABASE_URL`
- The bundled `postgres-js` client: see examples in `docs/OPERATIONS.md` §4

A second project (`rbgdovtegoawrqpllppe`) IS visible to the MCP but is empty / unused — ignore it.

## Conventions

- Never commit secrets. Use Vercel env vars in prod, `apps/web/.env.local` (git-ignored) in dev.
- Never edit `pnpm-lock.yaml` by hand.
- Tenant scoping: every query touching tenant data **must** filter by `tenantId` resolved through `getOrCreateTenant()`.
- Idempotent migrations only (use `IF NOT EXISTS`, `ADD VALUE IF NOT EXISTS`, `EXCEPTION WHEN duplicate_object`).
- Tone in commit messages: explain the *why*, not the *what*. Wrap at ~72 chars.

## When in doubt

Read **[`docs/OPERATIONS.md`](./docs/OPERATIONS.md)** — full runbook, every URL, every env var, every integration's status, all known issues with their workarounds.
