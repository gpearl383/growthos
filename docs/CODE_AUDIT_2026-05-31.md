# GrowthOS — Code Audit, 2026-05-31

> Snapshot review of the codebase at commit `b9d24eb`. Three parallel reviewers covered: frontend / React surface, backend / API surface, and security + data layer. Findings ranked by severity. **Update this file whenever a finding is fixed** (`✅ fixed in <commit>`) so we don't lose track.

## TL;DR

- **4 Critical security issues** that should be fixed before any wider release — see §1.
- **~14 High** issues — mostly defense-in-depth (per-instance rate limiter on Vercel, missing UNIQUE constraints, OAuth tokens in URL query strings, SSRF guard not DNS-resolving).
- **~25 Medium** — accessibility gaps, missing error/loading boundaries, validation tightening, index additions.
- **~15 Low/nits** — cosmetic.
- **Five things genuinely well-built** — CAS publishing, atomic onboarding transaction, AES-256-GCM with proper IV/tag handling, PGlite dynamic require + NFT exclusion, idempotent catchup migrations.

Full per-area findings in §4–6.

---

## 1. Critical — fix immediately

| # | Finding | Location | Risk | Status |
|---|---|---|---|---|
| C1 | `getMediaFilePath()` strips `/` and `\` but **not `..`** — crafted filename can escape the tenant directory | `apps/web/lib/media/storage.ts` | Path traversal — read/delete files outside tenant scope in local-dev mode (mitigated in prod by Blob backend, but the helper still ships) | ✅ fixed in audit commit |
| C2 | `/api/media/file/[tenantId]/[filename]` serves files by URL params with **no auth check** that `tenantId` matches the caller's tenant | `apps/web/app/api/media/file/[tenantId]/[filename]/route.ts` | Cross-tenant data leak (IDOR) — signed-in user could read another tenant's media in local-dev mode | ✅ fixed in audit commit |
| C3 | Meta OAuth state signed with hardcoded fallback `"growthos-dev-meta-secret"` when `META_APP_SECRET` is unset. Same pattern for TikTok | `apps/web/lib/meta/config.ts`, `apps/web/lib/tiktok/config.ts` | Account-linking CSRF — attacker who knows the constant can forge `state` binding a victim's tenant to their social account | ✅ fixed in audit commit |
| C4 | `metaWebhookVerifyToken()` falls back to hardcoded `"growthos-dev-verify"`; `verifyMetaSignature()` returns `true` when `metaConfigured` is false (fail-open) | `apps/web/lib/env.ts`, `apps/web/lib/meta/config.ts` | If Meta env vars are partially missing in prod, anyone can pass verification and POST forged webhook payloads | ✅ fixed in audit commit |

**Status:** all four fixed and committed alongside this audit. See §3 for patches and the actual diff.

---

## 2. High — should fix before active customers

| # | Finding | Location |
|---|---|---|
| H1 | ~~In-memory rate limiter resets per serverless instance — provides **no actual protection** on Vercel multi-instance prod~~ | `apps/web/lib/rate-limit.ts` | ✅ fixed — replaced with Upstash `slidingWindow` via `@upstash/ratelimit`; in-memory fallback only when `UPSTASH_REDIS_REST_URL` absent (local dev). Provision Upstash in Vercel dashboard to activate in prod. |
| H2 | `social_accounts` lacks `UNIQUE(platform, platform_user_id)` and `UNIQUE(tenant_id, platform)` — duplicate rows cause ambiguous webhook routing | `packages/db/src/schema.ts:208-226` | ✅ fixed — added `social_accounts_tenant_platform_uniq` and `social_accounts_platform_user_id_uniq` unique indexes in migration `0007` |
| H3 | `brand_assets` lacks `UNIQUE(tenant_id)` — `findFirst()` can return arbitrary row when accidentally duplicated | `packages/db/src/schema.ts:96-106` | ✅ fixed — added `brand_assets_tenant_id_uniq` unique index in migration `0008` |
| H4 | Meta Graph API token passed as `?access_token=` query param — leaks into logs, traces, referrers | `apps/web/lib/meta/config.ts:167-168` | ✅ fixed — `graphRequest` and `fetchManagedPages` now pass token via `Authorization: Bearer` header |
| H5 | OAuth callback resolves tenant from signed `state` only, never checks active Clerk session matches | `apps/web/app/api/meta/oauth/callback/route.ts:38` | ✅ fixed — callback now calls `getOrCreateTenant()` and rejects if session tenant ≠ state tenant |
| H6 | Auto-replies never dedupe on `commentId`/`message.mid` — duplicate Meta webhook delivery sends duplicate DMs | `apps/web/lib/meta/webhooks.ts:154` | ✅ fixed — `hasAutoReplyBeenSent()` checks `events` for prior `dm_sent` with matching `commentId`/`mid` before sending |
| H7 | DM auto-reply sends welcome on **every** inbound message, not just first contact — spam risk + burns budget | `apps/web/lib/meta/webhooks.ts:193` |
| H8 | Scheduled-post status orphans at `publishing` if `markPostPublished()` fails — post is live externally but stuck in app | `apps/web/lib/inngest/functions/publish-scheduled-post.ts:27` |
| H9 | `getAuthOrgId()` throws raw `Error("Not signed in")` — API routes return 500 instead of 401 JSON | `apps/web/lib/tenant.ts:19` |
| H10 | Canva access token stored in global cookie, not tenant-keyed — switching orgs in same browser uses wrong tenant's token | `apps/web/app/api/canva/oauth/callback/route.ts:53` |
| H11 | Post-image-generation `fetch(first.url)` has no SSRF guard or timeout | `apps/web/lib/openai/images.ts:40` |
| H12 | Meta + Clerk webhook routes have no rate limiter — invalid-signature spam is cheap DoS | `apps/web/app/api/webhooks/meta/route.ts:20`, `apps/web/app/api/webhooks/clerk/route.ts:16` |
| H13 | When `clerkConfigured=false`, middleware is a no-op and **all** API routes become unauthenticated — silent total auth bypass on misconfig | `apps/web/middleware.ts:16` |
| H14 | SSRF guard checks hostname string only — no DNS resolution, no redirect blocking → public hostname resolving to `169.254.169.254` still reaches metadata server | `apps/web/lib/url-safety.ts:41-61` |
| H15 | Several `update`/`delete` queries on tenant tables filter by row `id` only, not `tenantId` (defense-in-depth gap) | `apps/web/lib/secrets.ts:109`, `apps/web/lib/brand.ts:29`, `apps/web/lib/social-accounts.ts:66` |
| H16 | `notify-new-lead` Inngest job loads by `leadId` only, ignoring `event.data.tenantId` — forged event could route lead-notification emails | `apps/web/lib/inngest/functions/notify-new-lead.ts:57-59` |
| H17 | Blob uploads use `access: "public"` — URLs world-readable. Acceptable for post media (designed to be public) but risky for any future "private" use | `apps/web/lib/media/storage.ts:109` |
| H18 | No `<form>` pending guard on Save draft + Schedule post — double-clicks fire duplicate server actions | `apps/web/components/create/post-studio.tsx:316` |
| H19 | `ai-helper/chat.tsx` `sendMessage` reads stale `messages` from closure — rapid sends drop earlier turns | `apps/web/components/ai-helper/chat.tsx:66` |

---

## 3. Patches applied in this audit commit

The four Critical items were fixed in the same commit that adds this audit doc.

### C1 — path traversal in `getMediaFilePath`
Replaced regex strip-and-hope with `path.resolve()` + tenant-root boundary check. Throws on `.`, `..`, absolute paths, or anything resolving outside the tenant directory.

### C2 — IDOR on `/api/media/file/[tenantId]/[filename]`
Route now calls `getOrCreateTenant()` and rejects requests where the path `tenantId` doesn't match the authenticated tenant. Returns 403 on mismatch, 401 if unauthenticated.

### C3 — hardcoded OAuth signing fallback
Meta + TikTok config helpers no longer fall back to constants. They throw at module load if their respective secret is unset **and** the app is running in production (`NODE_ENV === "production"` or `VERCEL_ENV === "production"`). Local dev keeps a clearly-marked constant for ergonomics, with a one-time warning.

### C4 — Meta webhook verify token + fail-open signature
- `metaWebhookVerifyToken()` throws in production when unset (matches `TOKEN_ENCRYPTION_KEY` pattern).
- `verifyMetaSignature()` now returns `false` (fail closed) when the app isn't configured for Meta in production; only fails open in local dev with `META_APP_SECRET` unset.

---

## 4. Frontend review (full)

### Critical
- `apps/web/components/ai-helper/chat.tsx:66` — `sendMessage` uses stale `messages` closure. Fix with functional-updater `setMessages`.
- `apps/web/components/create/post-studio.tsx:316` — Save/Schedule have no pending guard; use `useFormStatus`.

### High
- `apps/web/app/create/page.tsx:60` — no `loading.tsx` or `<Suspense>`; cold start is a blank stall.
- `apps/web/components/create/media-panel.tsx:193` — delete dialog lacks focus trap + Escape handler.
- `apps/web/components/create/post-studio.tsx:223` — `handleCopy` swallows clipboard rejection silently.
- `apps/web/components/create/post-studio.tsx:104` — `handleUpload`/`handleDelete` `setState` after `fetch` without unmount guard.
- `apps/web/components/flash-banner.tsx:19` — no `role="alert"`/`aria-live`; not announced to screen readers.
- `apps/web/app/settings/connections/page.tsx:62` — unknown `?error=` values rendered verbatim (social-engineering risk).
- `apps/web/app/create/page.tsx:144` — same issue for `?canva=` values.

### Medium
- No `error.tsx` anywhere — unexpected throws fall through to generic Next.js 500.
- `apps/web/components/create/delete-draft-button.tsx:15` and `leads/delete-lead-button.tsx:16` use `window.confirm` (inaccessible on mobile).
- `apps/web/components/create/copy-panel.tsx:63` — form labels lack `htmlFor`/`id` association.
- `apps/web/components/create/media-panel.tsx:80` — hidden file input not programmatically associated with trigger button.
- `apps/web/components/create/media-panel.tsx:124` — thumbnail buttons share same aria-label; selection color-only.
- `apps/web/components/create/drafts-list.tsx:36` — active draft highlighted color-only (`aria-current` missing).
- `apps/web/components/get-started/wizard.tsx:109` — step progress has no `aria-current="step"` / live region.
- `apps/web/components/get-started/wizard.tsx:175` — type/goal tiles toggle via color only (`aria-pressed` missing).
- `apps/web/components/ai-helper/chat.tsx:154` — chat input lacks label.
- `apps/web/components/settings/api-keys-panel.tsx:105` — password inputs lack label.

### Low / nits
- `apps/web/components/ai-helper/chat.tsx:122` — message keys use `${role}-${index}` (duplicates possible).
- `apps/web/app/create/page.tsx:112` — flash banners persist on refresh; consider auto-dismiss.
- `apps/web/components/create/post-studio.tsx:87` — `minScheduleValue` recomputed every render.
- `apps/web/components/get-started/wizard.tsx:265` — logo `alt=""` even when user-supplied.
- `apps/web/components/create/platform-preview.tsx:1` — unnecessary `"use client"` directive.

### Things that look good
- `AppNavShell`/`AiHelperShell`/`SettingsGearShell` keep DB calls on the server, pass booleans into client leaves.
- `create/page.tsx` uses try/catch + `SetupError` for graceful schema/connection failures.
- `PostStudio` uses `key={resumeDraft?.id ?? "new"}` to reset state on resume — easy to regress, worth keeping.
- `media-panel.tsx` modal pattern (`role="dialog"`, `aria-modal`, `aria-labelledby`) is the reference for other dialogs.
- `DraftsList` stays a server component, isolating interactivity in `DeleteDraftButton`.

---

## 5. Backend / API review (full)

### Critical (covered in §1)
- C2 `/api/media/file/[tenantId]/[filename]` IDOR
- Blob `access: "public"` (deferred — see H17)
- C3 OAuth state hardcoded fallback
- Meta Graph token in URL (H4)
- C4 Meta webhook verify token fallback

### High
- See H1-H19 in §2

### Medium
- `apps/web/lib/rate-limit.ts:12` — in-memory only; see H1.
- `apps/web/app/api/ai/chat/route.ts:44` — body cast, not zod-parsed; unbounded `messages` length.
- `apps/web/app/actions/posts.ts:103` — `mediaUrl` not URL-validated.
- `apps/web/app/actions/posts.ts:184` — `scheduleGeneratedPost` returns silently on zod fail.
- `apps/web/app/api/leads/route.ts:14` — `email` not `.email()`-validated.
- `apps/web/app/api/media/upload/route.ts:44` — trusts client `file.type`.
- External `fetch` calls have no `AbortSignal`/timeout across Meta, TikTok, Canva, OpenAI, ElevenLabs.
- `apps/web/app/api/ai/generate-post/route.ts:14` — no `maxDuration` set.

### Low / nits
- `apps/web/app/api/ai/generate-image/route.ts:39` — `request.json()` outside try/catch.
- `apps/web/app/api/media/delete/route.ts:43` — bare `catch {}` swallows blob delete failures with no log.
- `apps/web/app/actions/auto-replies.ts:32` — `setAutoReplyPresetEnabled` result ignored.
- `apps/web/app/api/ai/chat/route.ts:41` — auth errors plain text while success streams; clients expecting JSON get inconsistent handling.

### Things that look good
- `claimPostForPublishing` uses CAS (`status = 'scheduled'` conditional update) to prevent double-publish.
- `/api/leads` combines zod validation + IP rate limiting + tenant resolution via published lead pages.
- Most tenant mutations route through `getOrCreateTenant()` + `tenantId`-scoped Drizzle `where` clauses.
- Canva OAuth uses PKCE + httpOnly cookies + cookie/`state` equality — stronger than Meta/TikTok.
- `completeOnboarding` wraps tenant/brand/lead-page/preset writes in one DB transaction.

---

## 6. Security + data layer review (full)

### Critical (covered in §1)
- C1 path traversal
- C4 webhook verify fail-open
- C3 OAuth state fallback

### High
- See H1-H17, H14 in §2

### Medium
- `apps/web/lib/oauth/state.ts:21-24` — no size cap before `JSON.parse`.
- `apps/web/lib/posts.ts:90-95` — `listDueScheduledPosts` filter has no composite `(status, scheduled_at)` index.
- `packages/db/src/schema.ts:124-135` — `tracking_links.tenant_id` has no index.
- `packages/db/src/schema.ts:167-181` — `media_assets` ordered by `created_at DESC` per tenant; only standalone `tenant_id` index, no composite.
- `apps/web/lib/meta/webhooks.ts:36-41` — auto-reply rate counting needs composite `(tenant_id, type, created_at)` index.
- `packages/db/src/schema.ts:108-122` — `lead_pages` has `UNIQUE(tenant_id, public_slug)` only in SQL, not in Drizzle schema (drift risk on regenerate).
- `packages/db/src/schema.ts:208-226` — `social_accounts` missing `UNIQUE(tenant_id, platform)` (see H2).
- `packages/db/src/local.ts:6-7, 60-61` — `GROWTHOS_ROOT` and `LOCAL_DATABASE_PATH` not in `turbo.json#globalEnv`.
- `packages/db/migrations/0000_init.sql:1` — non-idempotent; document that prod uses catchup, not raw 0000 replay.

### Low / nits
- `turbo.json:5-7` — `VERCEL`, `VERCEL_ENV`, `VERCEL_URL` declared but unused in data-layer code.
- `apps/web/lib/oauth/state.ts:10` — `nonce` never uniqueness-checked (replay window 15 min).
- `apps/web/lib/tenant.ts:13` — `"dev_local_org"` fallback collapses all local-dev users into one tenant.
- `scripts/inspect-tenants.mjs:38` — dumps lead PII to stdout; gate behind `--full` flag.
- `apps/web/lib/canva/config.ts` — Canva OAuth signing not centralized like Meta/TikTok.

### Tenant-isolation audit (verbatim)

| Table | Verdict |
|---|---|
| `tenants` | Scoped correctly everywhere — lookups by authenticated `clerkOrgId` or intentional public `slug` |
| `brand_assets` | Scoped correctly in all reads/writes (defense-in-depth gap on UPDATE — H15) |
| `lead_pages` | Scoped correctly — public reads join through resolved tenant |
| `tracking_links` | No queries yet; no leak, no enforcement layer |
| `posts` | Scoped correctly for tenant-facing CRUD; intentional global cron queries (background worker, not user-facing) |
| `media_assets` | Scoped correctly everywhere |
| `tenant_secrets` | Scoped correctly on reads; UPDATE at `secrets.ts:109` omits `tenantId` in WHERE (H15) |
| `social_accounts` | Tenant APIs scoped correctly; `getSocialAccountByPlatformUserId` is intentionally unscoped for webhooks but ambiguous if duplicates exist (H2) |
| `auto_reply_presets` | Scoped correctly everywhere |
| `leads` | Tenant CRUD scoped correctly; `notify-new-lead` ignores `event.data.tenantId` (H16) |
| `events` | Scoped correctly everywhere |

### Things that look good
- AES-256-GCM with random IV, auth-tag verification, hard refusal to run in prod without `TOKEN_ENCRYPTION_KEY`.
- Meta webhook signature uses `timingSafeEqual` with length check.
- OAuth state is HMAC-SHA256 + 15-min expiry + tested (`meta/config.test.ts`).
- `scripts/supabase-catchup-migrations.sql` stays in sync with `0001`-`0006` idempotently.
- PGlite is dynamically required and NFT-excluded — keeps local DB code out of prod bundles.

---

## 7. Doc-currency check

`docs/OPERATIONS.md` is up to date with:
- Vercel Blob store provisioning + `BLOB_READ_WRITE_TOKEN` env var (commit `b358ab7`)
- `VERCEL_FORCE_NO_BUILD_CACHE=1` confirmed set (commit `cade1e3`)
- Supabase project ref + manual migration workflow (commit `5278398`)
- New §5D explaining the Blob vs filesystem storage backend switch

This audit doc (`docs/CODE_AUDIT_2026-05-31.md`) is committed alongside the §3 patches, so the "what's been audited and when" state is durable in git.

A new **doc-currency rule** has been added to `CLAUDE.md`, `AGENTS.md`, and `.cursor/rules/growthos-operations.mdc` so future agents must keep this doc + `OPERATIONS.md` current with every change to infra, env vars, integrations, or operational procedures.
