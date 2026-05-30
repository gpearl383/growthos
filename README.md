# GrowthOS

Owner-first AI social media marketing assistant for small business owners.

**Pitch:** Social media marketing without the marketing degree.

## Monorepo

```
growthos/
├── apps/web/          # Next.js 15 app (main product)
├── packages/db/       # Drizzle schema + Postgres client
├── packages/ui/       # Shared UI components (shadcn-style)
├── packages/config/   # Shared TS configs
├── workers/redirect/  # Cloudflare Worker (tracked links, later)
└── docs/              # Product + engineering specs
```

## Stack

- Next.js 15, TypeScript, Tailwind CSS v4
- Clerk (Organizations = tenants)
- Supabase Postgres (or any Postgres) + Drizzle ORM
- Inngest (background jobs)
- Vercel deployment target

See [docs/GROWTHOS_MVP_TECHNICAL_SPEC.md](./docs/GROWTHOS_MVP_TECHNICAL_SPEC.md) for routes, schema, and build order.

## Quick start (local POC — no cloud database)

```bash
cd ~/Documents/growthos
pnpm install
cp apps/web/.env.local.example apps/web/.env.local
pnpm db:setup
pnpm --filter @growthos/web dev:clean
```

This uses an **embedded local Postgres** file at `.data/growthos` — no Supabase, Neon, or Docker required.

Open [http://localhost:3000/get-started](http://localhost:3000/get-started).

### Optional: cloud database (Supabase / Neon)

Set `USE_LOCAL_DB=false` and add `DATABASE_URL` in `apps/web/.env.local`, then run `pnpm db:setup`.

### Clerk webhook (tenant sync)

In Clerk Dashboard → Webhooks, subscribe to `organization.created` and `organization.updated`:

```
https://your-app.vercel.app/api/webhooks/clerk
```

Set `CLERK_WEBHOOK_SECRET` in env. Lazy sync also runs on first authenticated request.

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all apps in dev mode (Turbo) |
| `pnpm build` | Production build |
| `pnpm db:generate` | Generate Drizzle migrations |
| `pnpm db:migrate` | Run migrations against DATABASE_URL |
| `pnpm db:setup` | Apply schema migration to DATABASE_URL |
| `pnpm db:studio` | Open Drizzle Studio |
| `pnpm test` | Run unit tests (Vitest) |
| `pnpm smoke` | HTTP smoke checks (requires dev server on :3000) |

## MVP routes (scaffolded)

| Route | Status |
|-------|--------|
| `/` | Landing page |
| `/get-started` | **5-step onboarding wizard** |
| `/create` | **AI post generation** — generate, edit, save drafts |
| `/leads` | **Leads inbox** — list, call/text, status actions |
| `/auto-replies` | **Preset toggles** — comment/DM auto-replies |
| `/settings/connections` | **Meta OAuth** — connect Instagram & Facebook |
| `/api/ai/chat` | AI helper chat (streaming) |
| `/api/ai/generate-post` | Caption generation |
| `/api/meta/oauth/start` | Begin Meta OAuth |
| `/api/webhooks/meta` | Meta comment + DM webhooks |
| `/p/[tenantSlug]/[pageSlug]` | Public lead page + form submit |
| `/api/webhooks/clerk` | Clerk org → tenant sync |
| `/api/inngest` | Inngest serve endpoint |
| `/api/leads` | Form submission → `leads` + `events` |

## Next steps (M1 remainder)

1. ~~Clerk org → `tenants` row sync~~
2. ~~Get Started wizard (5 steps)~~
3. ~~Lead page form → `leads` + `events` table inserts~~
4. ~~Leads inbox list view with tap-to-call~~
5. Smoke test end-to-end

## Next steps (M3–M4)

1. ~~Meta OAuth at `/settings/connections`~~
2. ~~Meta webhooks + auto-reply processing~~
3. ~~AI helper chat~~
4. ~~Post scheduling + publish job~~
5. Stripe billing + weekly summary email (M5)
6. Token refresh job + production Meta App Review

## Docs

- [GROWTHOS_PLAN.html](./docs/GROWTHOS_PLAN.html) — product plan
- [GROWTHOS_MVP_TECHNICAL_SPEC.md](./docs/GROWTHOS_MVP_TECHNICAL_SPEC.md) — engineering spec
- [GROWTHOS_MVP_REVISED.md](./docs/GROWTHOS_MVP_REVISED.md) — MVP summary
