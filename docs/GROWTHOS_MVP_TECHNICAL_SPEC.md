# GrowthOS — MVP Technical Spec

**Version:** 1.0 · May 2026  
**Audience:** Engineers building the MVP  
**Product doc:** [GROWTHOS_PLAN.html](./GROWTHOS_PLAN.html)

---

## 1. Product summary (engineering context)

GrowthOS is an **AI social media marketing assistant** for small business owners. MVP delivers:

- Get Started wizard → brand profile + goal
- AI-generated posts (caption, hook, hashtags)
- Auto-created lead pages (book / quote / guide)
- DM & comment auto-replies (Meta presets)
- Instagram + Facebook publish (or copy-to-post fallback)
- Leads inbox (default home screen)

Analytics are **not** a user-facing MVP feature. Event logging supports lead source tagging only.

---

## 2. Stack

| Layer | Choice |
|-------|--------|
| App | Next.js 15 App Router, TypeScript, Tailwind, shadcn/ui |
| Auth | Clerk (Organizations = tenant) |
| Database | Neon Postgres + Drizzle ORM |
| Jobs | Inngest |
| AI | Vercel AI SDK + Anthropic Claude (primary) or OpenAI |
| Email | Resend (weekly summaries, lead notifications) |
| Payments | Stripe Billing |
| Redirects | Cloudflare Worker (tracked links) |
| Hosting | Vercel |
| File storage | Cloudflare R2 or Vercel Blob (photos, logos) |

---

## 3. Monorepo layout

```
growthos/
├── apps/
│   └── web/                    # Main Next.js app
│       ├── app/
│       │   ├── (auth)/         # Clerk-protected app routes
│       │   ├── get-started/
│       │   ├── create/
│       │   ├── leads/
│       │   ├── auto-replies/
│       │   ├── settings/
│       │   ├── p/[slug]/       # Public lead pages
│       │   └── api/
│       │       ├── inngest/
│       │       └── webhooks/
│       └── components/
├── packages/
│   ├── db/                     # Drizzle schema, migrations, client
│   ├── ui/                     # Shared shadcn components
│   └── config/                 # ESLint, TS, Tailwind presets
├── workers/
│   └── redirect/               # Cloudflare Worker (optional separate deploy)
├── docs/
├── .env.example
├── pnpm-workspace.yaml
├── turbo.json
└── package.json
```

**Project path:** `~/Documents/growthos/` (greenfield, separate from csm-website)

---

## 4. App routes

### Owner-facing (authenticated)

| Route | Screen | Purpose |
|-------|--------|---------|
| `/get-started` | Wizard | Onboarding; creates tenant profile + lead page |
| `/create` | Create & Post | AI posts, approve, schedule or copy |
| `/leads` | Leads inbox | Default home after onboarding complete |
| `/auto-replies` | Auto-Replies | Preset toggles, plain-English labels |
| `/settings/connections` | Connections | Connect/reconnect Instagram & Facebook |
| `/settings/account` | Account | Billing, business info |

### Public

| Route | Purpose |
|-------|---------|
| `/p/[slug]` | Lead page (book / quote / guide template) |
| `/api/leads` | POST form submission from lead page |

### API / webhooks

| Route | Purpose |
|-------|---------|
| `/api/inngest` | Inngest serve endpoint |
| `/api/webhooks/meta` | Meta comment + DM webhooks |
| `/api/webhooks/calendly` | Calendly booking → lead update |
| `/api/webhooks/stripe` | Subscription events |
| `/api/ai/chat` | AI helper chat (streaming) |
| `/api/ai/generate-post` | Caption generation |

### Redirect worker (Cloudflare)

| Route | Purpose |
|-------|---------|
| `https://go.growthos.link/{tenant}/{code}` | Log click event → 302 to lead page |

---

## 5. Database schema (MVP)

All tables include `tenant_id` for multi-tenancy. Enable RLS on Neon when feasible.

### `tenants`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| clerk_org_id | text UNIQUE | Clerk organization ID |
| slug | text UNIQUE | URL slug, e.g. `acme-hvac` |
| business_type | text | e.g. `local_services`, `salon`, `food`, `professional` |
| business_name | text | |
| goal | enum | `bookings`, `quotes`, `email_list`, `store_visits`, `followers` |
| offer_text | text | One-sentence offer |
| onboarding_complete | boolean | Default false |
| plan | text | `trial`, `active`, `canceled` |
| created_at | timestamptz | |

### `brand_assets`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| tenant_id | uuid FK | |
| logo_url | text | nullable |
| photo_urls | jsonb | Array of image URLs |
| created_at | timestamptz | |

### `lead_pages`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| tenant_id | uuid FK | |
| template | enum | `book`, `quote`, `guide` |
| public_slug | text | e.g. `offer` → `/p/acme-hvac/offer` |
| content_json | jsonb | Headline, subhead, CTA, calendly_url, etc. |
| published | boolean | |
| created_at | timestamptz | |

### `posts`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| tenant_id | uuid FK | |
| caption | text | |
| hook | text | nullable |
| hashtags | text | nullable |
| media_url | text | |
| platform | enum | `instagram`, `facebook` |
| status | enum | `draft`, `scheduled`, `published`, `failed`, `copied` |
| scheduled_at | timestamptz | nullable |
| published_at | timestamptz | nullable |
| platform_post_id | text | nullable |
| tracking_link_id | uuid FK | nullable |
| created_at | timestamptz | |

### `social_accounts`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| tenant_id | uuid FK | |
| platform | enum | `instagram`, `facebook` |
| platform_user_id | text | |
| access_token_enc | text | Encrypted |
| token_expires_at | timestamptz | |
| status | enum | `connected`, `expired`, `error` |
| last_error | text | nullable |
| updated_at | timestamptz | |

### `tracking_links`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| tenant_id | uuid FK | |
| post_id | uuid FK | nullable |
| code | text | Short code, e.g. `ig1` |
| destination_url | text | Lead page URL |
| created_at | timestamptz | |

### `auto_reply_presets`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| tenant_id | uuid FK | |
| preset_key | text | e.g. `comment_info`, `welcome_dm` |
| enabled | boolean | |
| keywords | jsonb | e.g. `["INFO","PRICE","info"]` |
| message_template | text | Supports `{business}`, `{link}` |
| updated_at | timestamptz | |

### `leads`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| tenant_id | uuid FK | |
| name | text | |
| email | text | nullable |
| phone | text | nullable |
| source | text | `instagram`, `facebook`, `form`, `calendly`, `dm` |
| status | enum | `new`, `contacted`, `booked`, `won`, `lost`, `archived` |
| notes | text | nullable |
| tracking_link_id | uuid FK | nullable |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### `events`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| tenant_id | uuid FK | |
| type | enum | `click`, `page_view`, `form_submit`, `booking`, `dm_sent` |
| lead_id | uuid FK | nullable |
| tracking_link_id | uuid FK | nullable |
| metadata | jsonb | |
| created_at | timestamptz | |

---

## 6. Meta API (Instagram + Facebook)

### Required permissions (App Review)

- `instagram_basic`
- `instagram_content_publish`
- `instagram_manage_comments` (comment → DM triggers)
- `instagram_manage_messages`
- `pages_show_list`
- `pages_read_engagement`
- `pages_manage_metadata`

### Webhooks to subscribe

- `comments` — detect INFO/PRICE keywords
- `messages` — inbound DMs for welcome auto-reply
- `feed` — optional, for publish confirmation

### Fallback if publish scope delayed

Ship **copy-to-post** flow:
1. AI generates caption + hook
2. Owner taps "Copy post" with step-by-step: "Open Instagram → Paste → Add this link"
3. Mark post status `copied` — still trackable via manual link paste

### Token health

- Daily Inngest job `refresh-social-tokens`
- UI banner: "Reconnect Instagram" when `status = expired`
- Store `last_error` for support debugging

---

## 7. Inngest jobs

| Function | Trigger | Action |
|----------|---------|--------|
| `generate-post-content` | Wizard step complete / manual | Call LLM → save `posts` drafts |
| `publish-scheduled-post` | Cron every 5 min | Publish due posts via Meta API |
| `process-meta-webhook` | Meta webhook | Match keyword → send DM with link |
| `send-weekly-summary` | Cron Monday 9am tenant TZ | Resend email with lead/post counts |
| `refresh-social-tokens` | Cron daily | Refresh Meta long-lived tokens |
| `notify-new-lead` | Lead created | Optional email/push to owner |

---

## 8. Auto-reply preset catalog

Owners pick presets in `/auto-replies` — no flow builder.

### Universal presets

| Key | Trigger | Message template |
|-----|---------|------------------|
| `comment_info` | Comment contains INFO, PRICE, QUOTE | "Thanks for your interest! Here's how to reach us: {link}" |
| `welcome_dm` | New inbound DM | "Hi! Thanks for messaging {business}. How can we help you today?" |
| `comment_link` | Comment contains LINK | "Here's the link you asked for: {link}" |

### By business type (examples)

**Local services (HVAC, plumbing, etc.)**
- comment_info: "Thanks! Get a free estimate here: {link}"
- welcome_dm: "Hi! {business} here. Need a quote or service call? Reply with your zip code or visit {link}"

**Salon / fitness**
- comment_info: "Thanks! Book your appointment: {link}"
- welcome_dm: "Hi! Ready to book? {link} — or tell us what service you're interested in."

**Food / retail**
- comment_info: "Thanks! See our menu/offers: {link}"
- welcome_dm: "Hi! Thanks for reaching out to {business}. How can we help you today?"

**Professional services**
- comment_info: "Thanks! Schedule a consultation: {link}"
- welcome_dm: "Hi! Thanks for contacting {business}. What can we help you with?"

**Compliance (all presets):**
- Rate limit: max 20 auto-DMs per hour per tenant
- Only reply once per user per comment thread
- Respect Meta 24-hour messaging window for non-keyword DMs

---

## 9. AI prompts (MVP)

### Post generation (`generate-post-content`)

**Inputs:** business_type, offer_text, goal, photo description (optional), platform

**Output (JSON):**
```json
{
  "hook": "string",
  "caption": "string",
  "hashtags": "string",
  "facebook_caption": "string (shorter)"
}
```

**System prompt principles:** Plain language, local business tone, no hype, include clear next step aligned with goal, no medical/legal claims without disclaimer flag.

### AI helper chat (`/api/ai/chat`)

**Context injected:** tenant business_name, offer, goal, recent leads count, posts scheduled this week

**Guardrails:** No jargon; suggest one action; can trigger post generation or link to auto-reply settings.

---

## 10. Environment variables

```bash
# Auth
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

# Database
DATABASE_URL=

# AI
ANTHROPIC_API_KEY=

# Meta
META_APP_ID=
META_APP_SECRET=
META_WEBHOOK_VERIFY_TOKEN=

# Inngest
INNGEST_EVENT_KEY=
INNGEST_SIGNING_KEY=

# Email
RESEND_API_KEY=
RESEND_FROM=GrowthOS <hello@growthos.app>

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PRICE_ID=

# Storage
BLOB_READ_WRITE_TOKEN=

# App
NEXT_PUBLIC_APP_URL=https://app.growthos.app
```

---

## 11. M1 build order (after scaffold)

1. **Scaffold** monorepo — Next.js, Clerk, Drizzle, shadcn, Inngest stub
2. **Tenant sync** — Clerk org created → `tenants` row
3. **Get Started wizard** — 5 steps → save tenant + brand_assets + lead_page
4. **Public lead page** — `/p/[slug]` renders template, form POST → `leads` + `events`
5. **Leads inbox** — list `leads` for tenant, tap-to-call links
6. **Smoke test** — complete wizard → share link → submit form → see lead in inbox

M2 adds AI post generation. M3 adds auto-replies. M4 adds Meta publish.

---

## 12. Explicitly deferred (do not build in MVP)

- Analytics dashboards, ROAS, A/B testing
- Polotno, image/video generation
- Visual funnel builder
- TikTok, LinkedIn, YouTube (P1.5 / Phase 2)
- HubSpot sync, paid ads, ClickHouse
- HubSpot-style pipeline UI (optional hidden toggle only)

---

## 13. Definition of done — ready to build

- [x] Product plan documented ([GROWTHOS_PLAN.html](./GROWTHOS_PLAN.html))
- [x] MVP spec documented (this file)
- [x] Documentation index ([README.md](./README.md))
- [ ] Repo scaffolded at `~/Documents/growthos/`
- [ ] Meta developer app created, App Review started
- [ ] Neon database provisioned
- [ ] Clerk application created with Organizations enabled

Next step: **Scaffold GrowthOS repo** (Agent mode).
