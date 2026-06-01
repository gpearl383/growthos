# GrowthOS — Integrations & API Setup Guide

**Version:** Post-audit (commit `570ca6b`)  
**Setup by:** ___________________________  
**Date started:** ___________________________  
**Date completed:** ___________________________  
**Target environment:** ☐ Production (`https://growthos-blond.vercel.app`)  ☐ Local dev (`http://localhost:3000`)  ☐ Both

**How to use:** Work through each section **in order** — later integrations depend on earlier ones. Mark each step:

- ✅ **Done** — configured and verified
- ⏳ **In progress** — started but not verified
- ⏭ **Skip** — not needed yet
- ❌ **Blocked** — add note (App Review pending, billing, etc.)

After finishing a section, run the **Verify** steps at the bottom before moving on. When everything is wired, use [`QA_TESTING_CHECKLIST.md`](./QA_TESTING_CHECKLIST.md) for full end-to-end validation.

**Companion docs:** [`OPERATIONS.md`](./OPERATIONS.md) (live infra IDs) · [`CODE_AUDIT_2026-05-31.md`](./CODE_AUDIT_2026-05-31.md) (known gaps)

---

## Quick reference — what unlocks what

| Integration | Env vars / setup | Unlocks in the app |
|---|---|---|
| **Clerk** | `NEXT_PUBLIC_CLERK_*`, `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SECRET` | Sign-up, sign-in, multi-tenant orgs |
| **Supabase Postgres** | `DATABASE_URL` | All data persistence (tenants, leads, posts, …) |
| **Vercel Blob** | `BLOB_READ_WRITE_TOKEN` (auto on Vercel) | Media upload, AI images, voiceovers on production |
| **Token encryption** | `TOKEN_ENCRYPTION_KEY` | OAuth tokens + per-tenant API keys at rest |
| **Anthropic** | `ANTHROPIC_API_KEY` and/or `/settings/api-keys` | AI captions, copilot chat |
| **OpenAI** | `OPENAI_API_KEY` and/or `/settings/api-keys` | AI image generation in Post Studio |
| **ElevenLabs** | `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID` and/or `/settings/api-keys` | AI voiceovers |
| **Meta (FB + IG)** | `META_APP_*`, webhooks, App Review | Connect IG/FB, publish, auto-replies |
| **TikTok** | `TIKTOK_CLIENT_*`, API approval | Connect TikTok, schedule/publish video |
| **Canva** | `CANVA_CLIENT_*` | “Edit in Canva” from Post Studio |
| **Inngest** | `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY` | Scheduled post publishing, lead email jobs |
| **Resend** | `RESEND_API_KEY`, `RESEND_FROM` | Email when a new lead arrives |
| **Upstash Redis** | `UPSTASH_REDIS_*` | Real rate limiting on lead form + webhooks (prod) |

---

## Section 0 — Prerequisites (before any API work)

| # | Step | Details | Status | Notes |
|---|---|---|---|---|
| 0.1 | GrowthOS deployed and reachable | Production: https://growthos-blond.vercel.app | | |
| 0.2 | GitHub repo cloned locally | `~/Documents/growthos/` | | |
| 0.3 | `apps/web/.env.local` exists | Copy from `apps/web/.env.local.example` | | |
| 0.4 | You can sign in to the app | Clerk auth working | | |
| 0.5 | Onboarding completed for your test tenant | `/get-started` → finish all 5 steps | | |
| 0.6 | Decide your public app URL | **Production:** `https://growthos-blond.vercel.app` · **Local:** `http://localhost:3000` | | |
| 0.7 | Password manager / secrets doc ready | Never commit API keys to git | | |

**Important:** Every OAuth redirect URI and webhook URL below must use the **exact** value of `NEXT_PUBLIC_APP_URL` for that environment.

---

## Section 1 — Core platform (required)

> These are already live on production for GrowthOS. Use this section to verify or re-provision.

### 1A — Vercel (hosting)

| # | Step | Details | Status | Notes |
|---|---|---|---|---|
| 1.1 | Open Vercel project | https://vercel.com/geoffrey-pearlmans-projects/growthos | | |
| 1.2 | Confirm `main` auto-deploys | Push to GitHub → new deployment | | |
| 1.3 | Confirm `VERCEL_FORCE_NO_BUILD_CACHE=1` | Production + Preview env vars (see `OPERATIONS.md`) | | |
| 1.4 | Set `NEXT_PUBLIC_APP_URL` | `https://growthos-blond.vercel.app` (Production) | | |

**Verify:** Open production URL → landing page loads.

---

### 1B — Supabase Postgres (database)

| # | Step | Details | Status | Notes |
|---|---|---|---|---|
| 1.5 | Open Supabase project | Ref `igizzkhcwednwbhqztgh` · https://supabase.com/dashboard/project/igizzkhcwednwbhqztgh | | |
| 1.6 | Copy connection string (pooler) | Settings → Database → Connection string → **Transaction pooler**, port **6543** | | |
| 1.7 | Set `DATABASE_URL` on Vercel | Production + Preview scopes | | |
| 1.8 | Set `USE_LOCAL_DB=false` on Vercel | Or omit — prod should never use PGlite | | |
| 1.9 | Run catch-up migrations (if schema drift) | `DATABASE_URL='…' node scripts/apply-supabase-catchup.mjs` | | |
| 1.10 | Local dev (optional) | Set `DATABASE_URL` in `.env.local` + `USE_LOCAL_DB=false`, or keep PGlite with `USE_LOCAL_DB=true` | | |

**Verify:** Sign in → complete onboarding → `/leads` loads without “schema out of date” error.

---

### 1C — Clerk (authentication)

| # | Step | Details | Status | Notes |
|---|---|---|---|---|
| 1.11 | Open Clerk dashboard | https://dashboard.clerk.com | | |
| 1.12 | Copy API keys | **Publishable** (`pk_test_…`) + **Secret** (`sk_test_…`) | | |
| 1.13 | Set on Vercel | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` | | |
| 1.14 | Enable Google OAuth (optional) | Clerk → User & Authentication → Social connections → Google | | |
| 1.15 | Enable Organizations | Clerk → Organizations (tenants map to Clerk orgs) | | |
| 1.16 | Create webhook | Endpoint: `{NEXT_PUBLIC_APP_URL}/api/webhooks/clerk` | | |
| 1.17 | Subscribe to events | `organization.created`, `organization.updated` | | |
| 1.18 | Copy signing secret → `CLERK_WEBHOOK_SECRET` | Vercel + local `.env.local` | | |
| 1.19 | Local `.env.local` | Paste same Clerk keys for local testing | | |

**Note:** `pk_live_` keys require a **custom domain** — `*.vercel.app` only works with `pk_test_` today.

**Verify:** Sign out → sign in with Google → land in app → nav links appear after onboarding.

---

### 1D — Token encryption (required in production)

| # | Step | Details | Status | Notes |
|---|---|---|---|---|
| 1.20 | Generate a key | `openssl rand -hex 32` | | |
| 1.21 | Set `TOKEN_ENCRYPTION_KEY` | Vercel Production + Preview + local `.env.local` | | |
| 1.22 | Never rotate without a migration plan | Rotating invalidates stored OAuth tokens + tenant API keys | | |

**Verify:** App boots on Vercel without encryption errors; `/settings/api-keys` can save a key.

---

### 1E — Vercel Blob (media storage — required on Vercel)

| # | Step | Details | Status | Notes |
|---|---|---|---|---|
| 1.23 | Open Blob store dashboard | Store `growthos-media` (`store_m9Ornm9zuMKzH5uS`) | | |
| 1.24 | Confirm store linked to `growthos` project | Auto-provisions `BLOB_READ_WRITE_TOKEN` | | |
| 1.25 | Confirm env var on Vercel | `BLOB_READ_WRITE_TOKEN` — Production, Preview, Development | | |
| 1.26 | Local dev (optional) | Leave unset → files go to `.data/uploads/` | | |

**Verify:** `/create` → upload an image → appears in media library → survives page refresh.

---

### 1F — Upstash Redis (rate limiting — strongly recommended for production)

| # | Step | Details | Status | Notes |
|---|---|---|---|---|
| 1.27 | Vercel dashboard → Storage → Create → **Upstash Redis** | Or https://upstash.com | | |
| 1.28 | Link store to `growthos` project | Auto-populates env vars | | |
| 1.29 | Confirm on Vercel | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | | |
| 1.30 | Redeploy after linking | Env vars picked up on next build | | |

**Without this:** lead-form rate limiting is in-memory only (weak on multi-instance Vercel).

**Verify:** Submit lead form 11× in one minute from same IP → 11th request rate-limited or friendly error.

---

## Section 2 — AI providers (Post Studio + copilot)

> **Two ways to configure:** (A) global env vars on Vercel / `.env.local`, or (B) per-tenant keys in **Settings → API Keys** (encrypted in DB). Tenant keys override env keys.

### 2A — Anthropic (captions, hooks, copilot) — **recommended first**

| # | Step | Details | Status | Notes |
|---|---|---|---|---|
| 2.1 | Create Anthropic account | https://console.anthropic.com | | |
| 2.2 | Add billing / credits | Required for API usage | | |
| 2.3 | Create API key | Starts with `sk-ant-` | | |
| 2.4 | **Option A:** Set `ANTHROPIC_API_KEY` on Vercel | All tenants use this key | | |
| 2.5 | **Option B:** Add key in app | Settings → API Keys → Anthropic | | |
| 2.6 | Local dev | Add to `apps/web/.env.local` OR use Settings → API Keys | | |

**Verify:** `/create` → “Generate copy with AI” → hook/caption/hashtags populate. Copilot chat (FAB or Create sidebar) streams a response.

---

### 2B — OpenAI (AI image generation)

| # | Step | Details | Status | Notes |
|---|---|---|---|---|
| 2.7 | Create OpenAI account | https://platform.openai.com | | |
| 2.8 | Add billing | Image API is paid | | |
| 2.9 | Create API key | Starts with `sk-` | | |
| 2.10 | Set `OPENAI_API_KEY` on Vercel and/or Settings → API Keys | | | |

**Verify:** `/create` → Enhance tools → Generate image → image appears in media library.

---

### 2C — ElevenLabs (AI voiceovers)

| # | Step | Details | Status | Notes |
|---|---|---|---|---|
| 2.11 | Create ElevenLabs account | https://elevenlabs.io | | |
| 2.12 | Copy API key | Profile → API Key | | |
| 2.13 | (Optional) Pick a voice ID | https://elevenlabs.io/voice-library → copy Voice ID | | |
| 2.14 | Set `ELEVENLABS_API_KEY` (+ optional `ELEVENLABS_VOICE_ID`) | Vercel and/or Settings → API Keys | | |

**Verify:** `/create` → add caption text → Generate voiceover → audio asset in library.

---

## Section 3 — Email notifications (Resend)

| # | Step | Details | Status | Notes |
|---|---|---|---|---|
| 3.1 | Create Resend account | https://resend.com | | |
| 3.2 | Add and verify sending domain | DNS: SPF, DKIM (optional DMARC) | | |
| 3.3 | Create API key | Resend dashboard → API Keys | | |
| 3.4 | Set `RESEND_API_KEY` on Vercel | Production + Preview | | |
| 3.5 | Set `RESEND_FROM` | e.g. `GrowthOS <hello@yourdomain.com>` — must use verified domain | | |
| 3.6 | Redeploy | | | |

**Verify:** Submit a lead on your public page → owner receives email (check spam). If no email, confirm Inngest is also wired (Section 4) — lead emails are triggered by background job.

---

## Section 4 — Background jobs (Inngest)

> Powers: **scheduled post publishing** (every 5 min cron) and **new-lead email notifications**.

| # | Step | Details | Status | Notes |
|---|---|---|---|---|
| 4.1 | Create Inngest account | https://www.inngest.com | | |
| 4.2 | Create app named `growthos` (or sync from Vercel) | App ID in code: `growthos` | | |
| 4.3 | Install Inngest Vercel integration (recommended) | Auto-syncs keys + registers `/api/inngest` | | |
| 4.4 | Or set keys manually on Vercel | `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY` | | |
| 4.5 | Confirm serve URL | `{NEXT_PUBLIC_APP_URL}/api/inngest` | | |
| 4.6 | Redeploy production | | | |
| 4.7 | Inngest dashboard → Apps → sync | Functions should appear: `publish-scheduled-post`, `notify-new-lead` | | |
| 4.8 | Local dev (optional) | Run `npx inngest-cli@latest dev` alongside `pnpm dev` | | |

**Cron:** `publish-scheduled-post` runs every **5 minutes** (`*/5 * * * *`).

**Verify:** Schedule a post 6–10 minutes out with Meta connected → wait for cron → post status becomes **Published** (see QA checklist §7A.9).

---

## Section 5 — Meta (Facebook + Instagram)

> **Hardest integration** — requires a Meta Developer app, correct OAuth redirect, webhooks, and **App Review** for production permissions. Plan **1–3 weeks** for review.

### 5A — Meta business prerequisites (do this first)

| # | Step | Details | Status | Notes |
|---|---|---|---|---|
| 5.1 | Facebook Page for your business | https://facebook.com/pages/create | | |
| 5.2 | Instagram **Business** or **Creator** account | Not a personal IG account | | |
| 5.3 | Link IG to Facebook Page | IG app → Settings → Account → Linked accounts → Facebook | | |
| 5.4 | Confirm IG appears under Page | Meta Business Suite → Settings → Instagram | | |
| 5.5 | Meta Business Portfolio (recommended) | https://business.facebook.com | | |

**Without 5.1–5.4:** OAuth may succeed but “No pages / Instagram accounts found.”

---

### 5B — Meta Developer App

| # | Step | Details | Status | Notes |
|---|---|---|---|---|
| 5.6 | Create app at Meta for Developers | https://developers.facebook.com/apps/ | | |
| 5.7 | App type | **Business** (for Pages + Instagram) | | |
| 5.8 | Add products | **Facebook Login for Business**, **Instagram Graph API**, **Webhooks** | | |
| 5.9 | Copy **App ID** → `META_APP_ID` | Vercel + `.env.local` | | |
| 5.10 | Copy **App Secret** → `META_APP_SECRET` | Vercel + `.env.local` — never expose client-side | | |
| 5.11 | Generate webhook verify token | Random string, e.g. `openssl rand -hex 16` | | |
| 5.12 | Set `META_WEBHOOK_VERIFY_TOKEN` | Same value in Vercel **and** Meta webhook config | | |
| 5.13 | Add OAuth redirect URI | `{NEXT_PUBLIC_APP_URL}/api/meta/oauth/callback` | | |
| 5.14 | Production example | `https://growthos-blond.vercel.app/api/meta/oauth/callback` | | |
| 5.15 | Local dev example | `http://localhost:3000/api/meta/oauth/callback` | | |
| 5.16 | Add app domain | `growthos-blond.vercel.app` (no `https://`) | | |
| 5.17 | Add Privacy Policy URL | Required for App Review — can be a simple page | | |
| 5.18 | Redeploy Vercel after env changes | | | |

**OAuth scopes GrowthOS requests** (all need App Review for production):

```
pages_show_list
pages_read_engagement
pages_manage_metadata
instagram_basic
instagram_manage_comments
instagram_manage_messages
instagram_content_publish
```

---

### 5C — Meta Webhooks

| # | Step | Details | Status | Notes |
|---|---|---|---|---|
| 5.19 | Meta app → Webhooks → Page object | Callback URL: `{NEXT_PUBLIC_APP_URL}/api/webhooks/meta` | | |
| 5.20 | Verify token | Must match `META_WEBHOOK_VERIFY_TOKEN` exactly | | |
| 5.21 | Subscribe to fields | `feed` (comments), `messages` (DMs) | | |
| 5.22 | Subscribe app to your Facebook Page | Webhooks → Page → Subscribe | | |
| 5.23 | Test webhook | Meta dashboard → Send test → expect 200 | | |

**Verify:** Meta webhook GET challenge returns 200 with challenge string.

---

### 5D — Meta App Review (production)

| # | Step | Details | Status | Notes |
|---|---|---|---|---|
| 5.24 | Switch app to **Live** mode | Only after review (or add test users in Dev mode) | | |
| 5.25 | Submit permissions for review | Each scope listed in §5B | | |
| 5.26 | Provide screencast + test credentials | Show OAuth connect, publish, auto-reply flow | | |
| 5.27 | Add test users (dev mode only) | Meta app → Roles → Test users | | |

**Dev mode workaround:** Add your Facebook account as Admin/Developer on the app — you can test without full review, but only for accounts with roles on the app.

---

### 5E — Connect in GrowthOS

| # | Step | Details | Status | Notes |
|---|---|---|---|---|
| 5.28 | Go to **Settings → Connections** | `/settings/connections` | | |
| 5.29 | Click **Connect Instagram** or **Connect Facebook** | Same Meta OAuth flow connects both | | |
| 5.30 | Approve all requested permissions | | | |
| 5.31 | Confirm redirect back with success banner | “Meta accounts connected” | | |
| 5.32 | Both cards show **Connected** | Instagram + Facebook if Page has linked IG | | |

**Verify:** Run QA checklist §7A (Meta connection + schedule + publish + auto-replies §8).

---

## Section 6 — TikTok

> Requires TikTok Developer account and **Content Posting API** approval.

| # | Step | Details | Status | Notes |
|---|---|---|---|---|
| 6.1 | Register at TikTok for Developers | https://developers.tiktok.com | | |
| 6.2 | Create an app | Enable **Login Kit** + **Content Posting API** | | |
| 6.3 | Copy **Client Key** → `TIKTOK_CLIENT_KEY` | Vercel + `.env.local` | | |
| 6.4 | Copy **Client Secret** → `TIKTOK_CLIENT_SECRET` | | | |
| 6.5 | Add redirect URI | `{NEXT_PUBLIC_APP_URL}/api/tiktok/oauth/callback` | | |
| 6.6 | Production example | `https://growthos-blond.vercel.app/api/tiktok/oauth/callback` | | |
| 6.7 | Submit for review (if required) | Content Posting often needs approval | | |
| 6.8 | Redeploy Vercel | | | |
| 6.9 | Settings → Connections → **Connect TikTok** | | | |
| 6.10 | Approve permissions | Scopes: `user.info.basic`, `video.publish` | | |

**Note:** TikTok does **not** support comment/DM auto-replies in GrowthOS yet — publishing + copy-to-post only.

**Verify:** QA checklist §7B.

---

## Section 7 — Canva Connect (optional)

| # | Step | Details | Status | Notes |
|---|---|---|---|---|
| 7.1 | Canva Developer portal | https://www.canva.com/developers/ | | |
| 7.2 | Create Connect API integration | | | |
| 7.3 | Copy **Client ID** → `CANVA_CLIENT_ID` | | | |
| 7.4 | Copy **Client Secret** → `CANVA_CLIENT_SECRET` | | | |
| 7.5 | Add redirect URI | `{NEXT_PUBLIC_APP_URL}/api/canva/oauth/callback` | | |
| 7.6 | Scopes (app requests) | `design:content:read/write`, `asset:read/write` | | |
| 7.7 | Redeploy Vercel | | | |
| 7.8 | In Post Studio → Connect Canva / “Edit in Canva” | OAuth from `/create` or Canva flow | | |

**Verify:** QA checklist §7C.

---

## Section 8 — Environment variable master checklist

> Every var must be in `turbo.json#globalEnv` (already done in repo). Set on **Vercel** for production; copy to `apps/web/.env.local` for local.

### Required (app won't work without these on Vercel)

| Variable | Set? | Where | Notes |
|---|---|---|---|
| `DATABASE_URL` | ☐ | Vercel | Supabase pooler URL, port 6543 |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | ☐ | Vercel | `pk_test_…` for vercel.app |
| `CLERK_SECRET_KEY` | ☐ | Vercel | `sk_test_…` |
| `CLERK_WEBHOOK_SECRET` | ☐ | Vercel | From Clerk webhook |
| `TOKEN_ENCRYPTION_KEY` | ☐ | Vercel | `openssl rand -hex 32` |
| `BLOB_READ_WRITE_TOKEN` | ☐ | Vercel | Auto from Blob store link |
| `NEXT_PUBLIC_APP_URL` | ☐ | Vercel | `https://growthos-blond.vercel.app` |

### Strongly recommended (production)

| Variable | Set? | Unlocks |
|---|---|---|
| `UPSTASH_REDIS_REST_URL` | ☐ | Distributed rate limiting |
| `UPSTASH_REDIS_REST_TOKEN` | ☐ | ↑ |
| `VERCEL_FORCE_NO_BUILD_CACHE` | ☐ | Already set — do not remove |

### AI (optional — or use Settings → API Keys)

| Variable | Set? | Unlocks |
|---|---|---|
| `ANTHROPIC_API_KEY` | ☐ | AI copy + copilot |
| `OPENAI_API_KEY` | ☐ | AI images |
| `ELEVENLABS_API_KEY` | ☐ | Voiceovers |
| `ELEVENLABS_VOICE_ID` | ☐ | Voice selection |

### Social + design (optional)

| Variable | Set? | Unlocks |
|---|---|---|
| `META_APP_ID` | ☐ | Facebook + Instagram |
| `META_APP_SECRET` | ☐ | ↑ |
| `META_WEBHOOK_VERIFY_TOKEN` | ☐ | IG/FB webhooks + auto-replies |
| `TIKTOK_CLIENT_KEY` | ☐ | TikTok |
| `TIKTOK_CLIENT_SECRET` | ☐ | ↑ |
| `CANVA_CLIENT_ID` | ☐ | Canva |
| `CANVA_CLIENT_SECRET` | ☐ | ↑ |

### Background + email (optional)

| Variable | Set? | Unlocks |
|---|---|---|
| `INNGEST_EVENT_KEY` | ☐ | Scheduled publish + lead jobs |
| `INNGEST_SIGNING_KEY` | ☐ | ↑ |
| `RESEND_API_KEY` | ☐ | Lead notification emails |
| `RESEND_FROM` | ☐ | Sender address (verified domain) |

**Vercel env vars UI:** https://vercel.com/geoffrey-pearlmans-projects/growthos/settings/environment-variables

**After any Vercel env change:** push a commit or trigger redeploy so the build picks up new values.

---

## Section 9 — Recommended setup order (summary)

Use this if you want the fastest path to “full functionality”:

```
1. Core (Section 1)          — already done on prod; verify
2. Anthropic (Section 2A)    — biggest UX win, ~10 min
3. Upstash (Section 1F)      — ~10 min, hardens prod
4. Inngest (Section 4)       — unlocks scheduled publish + lead emails
5. Resend (Section 3)        — pairs with Inngest for emails
6. OpenAI + ElevenLabs (2B–C)— optional AI extras
7. Meta (Section 5)          — longest; start App Review early
8. TikTok (Section 6)        — parallel with Meta review
9. Canva (Section 7)         — optional polish
```

**Parallel track:** While Meta App Review is pending, you can complete Sections 1–4 and 2A–2C and test everything except live IG/FB publish and auto-replies.

---

## Section 10 — URL cheat sheet (production)

Replace `{APP}` with your `NEXT_PUBLIC_APP_URL` (e.g. `https://growthos-blond.vercel.app`).

| Purpose | URL |
|---|---|
| App home | `{APP}/` |
| Settings → Connections | `{APP}/settings/connections` |
| Settings → API Keys | `{APP}/settings/api-keys` |
| Meta OAuth callback | `{APP}/api/meta/oauth/callback` |
| Meta webhooks | `{APP}/api/webhooks/meta` |
| TikTok OAuth callback | `{APP}/api/tiktok/oauth/callback` |
| Canva OAuth callback | `{APP}/api/canva/oauth/callback` |
| Clerk webhook | `{APP}/api/webhooks/clerk` |
| Inngest serve | `{APP}/api/inngest` |
| Public lead page | `{APP}/p/{tenantSlug}/offer` |

---

## Section 11 — Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| “Clerk is not configured” banner | Env vars missing from build (`turbo.json#globalEnv`) or not set on Vercel | Re-check Vercel env vars; redeploy without stale cache |
| Media upload fails on production | `BLOB_READ_WRITE_TOKEN` missing | Link Blob store to Vercel project |
| “Meta is not configured” on Connections | `META_APP_ID` / `META_APP_SECRET` unset | Section 5B |
| OAuth redirect mismatch | Redirect URI in provider ≠ `{APP}/api/.../callback` | Must match **exactly**, including trailing slash rules |
| “No pages found” after Meta OAuth | IG not linked to Facebook Page | Section 5A |
| Webhook verify fails | `META_WEBHOOK_VERIFY_TOKEN` mismatch | Same string in Meta dashboard + Vercel |
| Scheduled posts never publish | Inngest not wired or Meta not connected | Sections 4 + 5 |
| No lead emails | Resend or Inngest missing; domain not verified | Sections 3 + 4 |
| AI features disabled | No Anthropic/OpenAI/ElevenLabs key | Section 2 or Settings → API Keys |
| Rate limit on lead form after testing | 10 submits/min/IP | Wait 60s or test from different IP |
| TikTok OAuth 503 | `TIKTOK_CLIENT_*` not set | Section 6 |

---

## Section 12 — Final validation

When all sections above are ✅, run the full **[QA Testing Checklist](./QA_TESTING_CHECKLIST.md)** — especially:

- §6 — AI features  
- §7 — Social connections  
- §8 — Auto-replies (requires Meta + webhooks)  
- §13 — End-to-end user journey  

Export to PDF (optional, same as QA checklist):

```bash
# From repo root, if you have pandoc installed:
pandoc docs/INTEGRATIONS_SETUP_GUIDE.md -o docs/INTEGRATIONS_SETUP_GUIDE.pdf
```

Or open the `.md` in Cursor / VS Code → Markdown PDF extension → Export.

---

## Sign-off

| Setup by | Date completed | Environment | Integrations live |
|---|---|---|---|
| | | ☐ Prod ☐ Local | ☐ Core ☐ AI ☐ Meta ☐ TikTok ☐ Canva ☐ Inngest ☐ Resend |

---

*Generated from codebase at commit `570ca6b`. Update this guide when new integrations or env vars are added — see doc-currency rule in `CLAUDE.md`.*
