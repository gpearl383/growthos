# GrowthOS

Owner-first AI social media marketing assistant for small business owners.

**Pitch:** Social media marketing without the marketing degree.

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

---

## What it does

GrowthOS is a single-tenant-per-business app that handles the parts of social
marketing that small business owners actually hate doing:

- **Guided 5-step onboarding** that produces a working lead page in under 2 minutes.
- **Post Studio** — AI-written captions and hooks (Anthropic), AI image
  generation (OpenAI), AI voiceovers (ElevenLabs), Canva Connect for design
  editing, multi-platform previews (Instagram / Facebook / TikTok), and
  schedule-or-copy-to-post.
- **Leads inbox** — every form fill, DM, and booking lands in one plain-English
  inbox with tap-to-call / tap-to-text.
- **Auto-replies** — preset comment & DM auto-replies powered by Meta webhooks.
- **AI copilot** — a chat bubble that knows your tenant context (business name,
  goal, offer, website, lead counts) and can answer "what should I post about?"
- **Analytics** — basic post / lead funnel breakdown per tenant.
- **In-app API key management** — non-technical users can paste Anthropic /
  OpenAI / ElevenLabs keys directly in `/settings/api-keys` (encrypted at rest,
  per-tenant, with an env-var fallback for self-hosters).
- **Brand panel** — edit your website URL and brand-photo library in
  `/settings/brand` so the lead page and AI copilot stay in sync.

## Monorepo

```
growthos/
├── apps/web/          # Next.js 15 app (the product)
├── packages/db/       # Drizzle schema + Postgres client + migrations
├── packages/ui/       # Shared UI components (shadcn-style)
├── packages/config/   # Shared TS configs
├── workers/redirect/  # Cloudflare Worker for tracked links (later)
├── scripts/           # db:setup, db:reset, smoke tests, dev helpers
└── docs/              # Product + engineering specs
```

## Stack

- **Next.js 15** (App Router, Server Components, Server Actions)
- **TypeScript 5**, **Tailwind CSS v4**
- **Drizzle ORM** on **PGlite** locally (zero-setup embedded Postgres) or any
  managed Postgres (Supabase, Neon, RDS) for production
- **Clerk** for auth (Organizations = tenants), optional in local dev
- **Anthropic Claude** (copy + vision + copilot), **OpenAI** (images),
  **ElevenLabs** (voiceovers), **Canva Connect** (design editing) — all
  optional, app degrades gracefully
- **Meta Graph API** (Instagram + Facebook) and **TikTok Login Kit** with
  webhook signature verification
- **Inngest** for background jobs (scheduled publish, lead notifications)
- **Vercel** as the deployment target

## Quick start (local POC — no cloud anything)

```bash
git clone https://github.com/gpearl383/growthos.git
cd growthos
pnpm install
cp apps/web/.env.local.example apps/web/.env.local
pnpm db:setup
pnpm --filter @growthos/web dev
```

This uses an **embedded PGlite database** at `.data/growthos` — no Supabase,
Neon, or Docker required. You don't need Clerk, Anthropic, OpenAI, or any
other API keys to boot the app — every integration is optional and the UI
shows clear setup hints when keys are missing.

Open [http://localhost:3000](http://localhost:3000) and click **Get started**.

### Recovering from a stuck local DB

PGlite can occasionally get into a bad state if the dev server is killed
mid-write. If you see `Aborted()` or `Migration failed: Aborted()`:

```bash
pnpm db:reset          # archives the broken dir, reinitialises from scratch
pnpm db:reset --hard   # same thing, but deletes the broken dir
```

### Toggling onboarding state during testing

```bash
node scripts/toggle-onboarding.mjs false   # see the pre-onboarding UI
node scripts/toggle-onboarding.mjs true    # see the onboarded UI
```

(Briefly stop the dev server first — PGlite is single-writer.)

### Optional: managed Postgres (Supabase / Neon)

Set `USE_LOCAL_DB=false` and add `DATABASE_URL` in `apps/web/.env.local`,
then `pnpm db:setup`.

### Optional: Clerk

Add `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`. Without them
the app uses a single `dev_local_org` tenant — fine for local development.

In Clerk Dashboard → Webhooks, subscribe to `organization.created` /
`organization.updated` pointing at `/api/webhooks/clerk` and set
`CLERK_WEBHOOK_SECRET`. Lazy sync also runs on first authenticated request.

## Production-readiness notes

| Setting | Why it matters |
|---|---|
| `TOKEN_ENCRYPTION_KEY` | **Required in production.** OAuth tokens and per-tenant API keys are AES-256-GCM encrypted with a key derived from this value. In dev it falls back to a clearly-marked insecure default and warns on first use. Generate with `node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"`. |
| `META_APP_SECRET` | Required to verify `X-Hub-Signature-256` on inbound webhooks. |
| `DATABASE_URL` | Required (with `USE_LOCAL_DB=false`) for any non-local deployment — PGlite is local-only. |
| `NEXT_PUBLIC_APP_URL` | Used to construct OAuth redirect URIs and tracked-link bases. Must be your real origin in production. |

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all apps in dev mode (Turbo) |
| `pnpm --filter @growthos/web dev` | Web app only |
| `pnpm build` | Production build |
| `pnpm typecheck` | TSC noEmit across the monorepo |
| `pnpm lint` | ESLint across the monorepo |
| `pnpm test` | Unit tests (Vitest) |
| `pnpm db:setup` | Apply schema migrations |
| `pnpm db:reset` | Archive local PGlite and re-apply migrations (safe-guarded against remote DBs) |
| `pnpm db:generate` | Generate a new Drizzle migration from the schema |
| `pnpm db:migrate` | Run drizzle-kit migrate against `DATABASE_URL` |
| `pnpm db:studio` | Open Drizzle Studio |
| `pnpm smoke` | HTTP smoke checks (requires dev server on :3000) |

## Routes

### Public

| Route | Purpose |
|---|---|
| `/` | Landing page (CTAs gated on onboarding state) |
| `/get-started` | 5-step onboarding wizard |
| `/p/[tenantSlug]/[pageSlug]` | Public lead page with form submit |

### Authenticated app

| Route | Purpose |
|---|---|
| `/create` | Post Studio — AI generation, media picker, multi-platform preview, drafts, scheduling |
| `/leads` | Leads inbox with delete + status actions |
| `/auto-replies` | Comment & DM auto-reply preset toggles |
| `/analytics` | Post + lead funnel breakdown |
| `/settings/connections` | Meta + TikTok + Canva OAuth |
| `/settings/api-keys` | Per-tenant AI provider keys (Anthropic / OpenAI / ElevenLabs) |
| `/settings/brand` | Business website URL + brand photo library |
| `/settings/account` | Account settings |

### API

| Route | Purpose |
|---|---|
| `/api/ai/chat` | Streaming AI copilot |
| `/api/ai/generate-post` | Caption + hook generation |
| `/api/ai/generate-image` | OpenAI image generation |
| `/api/audio/generate-voiceover` | ElevenLabs voiceover |
| `/api/media/upload` | Multipart media upload (50MB cap) |
| `/api/media/delete` | Delete a tenant's media asset |
| `/api/meta/oauth/start`, `/api/meta/oauth/callback` | Meta OAuth |
| `/api/tiktok/oauth/start`, `/api/tiktok/oauth/callback` | TikTok OAuth |
| `/api/canva/oauth/start`, `/api/canva/oauth/callback`, `/api/canva/designs/create` | Canva Connect |
| `/api/webhooks/meta` | Meta comment + DM webhooks (signature verified) |
| `/api/webhooks/clerk` | Clerk org → tenant sync |
| `/api/leads` | Public lead form submission (rate-limited) |
| `/api/inngest` | Inngest serve endpoint |

## Security notes

This is a real attempt at being production-shaped, not just a demo:

- **Onboarding gate** — pre-onboarding users see only the landing page CTA;
  all product routes & APIs `307`/`403` to `/get-started`.
- **Tenant isolation** — every query is scoped by `tenants.id`; nothing is
  shared across tenants by default.
- **Token + API key encryption** — AES-256-GCM with a hashed key, stored
  per-tenant in `tenant_secrets`.
- **SSRF guard** — server-side image fetches reject private/loopback hosts
  and non-http(s) schemes.
- **OAuth state** — HMAC-signed, length-checked, parser hardened against
  malformed input.
- **Meta webhook signatures** — `X-Hub-Signature-256` verified against
  `META_APP_SECRET`.
- **Upload size cap** — 50MB hard limit on `/api/media/upload`.
- **Rate limiting** — in-memory sliding-window limiter on public APIs
  (`/api/leads`) keyed on client IP.
- **Atomic scheduled publish** — the publish job uses
  `compare-and-swap` from `scheduled → publishing` so two workers can't
  double-publish the same post.

## Status

This is a working POC, not a launched product. The core flows (onboarding,
post creation, leads inbox, auto-replies, public lead page, AI copilot,
OAuth flows, settings) all work end-to-end. Stripe billing, weekly summary
email, token-refresh jobs, and Meta App Review are still to do.

## Docs

- **[`docs/OPERATIONS.md`](./docs/OPERATIONS.md)** — **live infra source of truth** — every URL, env var, integration status, runbook procedure, and known gotcha. Start here if you're operating the deployed app.
- **[`docs/INTEGRATIONS_SETUP_GUIDE.md`](./docs/INTEGRATIONS_SETUP_GUIDE.md)** — **step-by-step setup** for all APIs and social integrations (Meta/IG/FB, TikTok, AI, Inngest, Resend, …)
- **[`docs/QA_TESTING_CHECKLIST.md`](./docs/QA_TESTING_CHECKLIST.md)** — end-to-end validation checklist after setup
- [`CLAUDE.md`](./CLAUDE.md) / [`AGENTS.md`](./AGENTS.md) — compact agent memory auto-loaded by Claude / Cursor / Codex sessions
- [`docs/GROWTHOS_EXECUTIVE_SUMMARY.md`](./docs/GROWTHOS_EXECUTIVE_SUMMARY.md) — what it is + why
- [`docs/GROWTHOS_REBUILD_SPEC.md`](./docs/GROWTHOS_REBUILD_SPEC.md) — full technical spec
- [`docs/GROWTHOS_MVP_TECHNICAL_SPEC.md`](./docs/GROWTHOS_MVP_TECHNICAL_SPEC.md) — original engineering spec

## Deployed instance

Currently live at **https://growthos-blond.vercel.app** (Vercel + Supabase + Clerk).
Operational details and recovery procedures live in [`docs/OPERATIONS.md`](./docs/OPERATIONS.md).

## License

[MIT](./LICENSE) © 2026 Geoffrey Pearlman
