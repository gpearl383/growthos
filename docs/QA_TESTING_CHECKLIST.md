# GrowthOS — QA Testing Checklist

**Version:** Post-audit (commit `f703642`)
**Tester:** ___________________________
**Date:** ___________________________
**Environment:** ☐ Production (growthos-blond.vercel.app)  ☐ Local dev (localhost:3000)

**How to use:** Work through each section in order. Mark each item:
- ✅ **Pass** — works as expected
- ❌ **Fail** — broken or crashes (add note)
- ⚠️ **Partial** — works with issues (add note)
- ⏭ **Skip** — not applicable / not configured

Add notes in the **Result / Notes** column. File issues for anything marked ❌ or ⚠️.

---

## Section 1 — Authentication & Account Setup

| # | Test Step | Expected Result | Result / Notes |
|---|---|---|---|
| 1.1 | Navigate to the app root URL | Landing page loads; "Get started" or sign-in CTA visible | |
| 1.2 | Click "Sign up" / "Get started" | Clerk sign-up page loads | |
| 1.3 | Create a new account with email + password | Account created; redirected into app | |
| 1.4 | Sign out | Redirected to landing / sign-in page | |
| 1.5 | Sign back in with same credentials | Lands back in app (dashboard or /get-started) | |
| 1.6 | Try to access `/leads` while signed out | Redirected to sign-in (not a 500) | |
| 1.7 | Try Google OAuth sign-in (if available) | OAuth flow completes and returns to app | |

---

## Section 2 — Onboarding Wizard (5 Steps)

> Start from a fresh account that has not completed onboarding. URL: `/get-started`

| # | Test Step | Expected Result | Result / Notes |
|---|---|---|---|
| **Step 1 — Your Business** | | | |
| 2.1 | Wizard loads at `/get-started` | Step 1 of 5 shown; progress bar visible | |
| 2.2 | Leave business name blank and click Next | Next button disabled or validation error shown | |
| 2.3 | Enter a business name (min 2 chars) | Next button becomes enabled | |
| 2.4 | Enter an invalid website URL (e.g. "notaurl") | Warning shown; Next button disabled | |
| 2.5 | Enter a valid website URL (e.g. https://example.com) | No error; Next enabled | |
| 2.6 | Leave website URL blank | Allowed — it's optional; Next still enabled | |
| 2.7 | Click Next → advances to Step 2 | Step 2 "Your goal" shown | |
| **Step 2 — Your Goal** | | | |
| 2.8 | See goal tile options | At least: Bookings, Leads, Sales, Awareness tiles shown | |
| 2.9 | Click each goal tile | Tile highlights; only one selected at a time | |
| 2.10 | Click Next without selecting | Next disabled | |
| 2.11 | Select a goal and click Next | Advances to Step 3 | |
| **Step 3 — Your Offer** | | | |
| 2.12 | Offer text field is shown | Placeholder text guides the user | |
| 2.13 | Type a one-sentence offer description | Character count or field accepts input | |
| 2.14 | Click Next → advances to Step 4 | Step 4 "Photos" shown | |
| **Step 4 — Photos** | | | |
| 2.15 | Step 4 loads | Logo URL and photo URL fields shown | |
| 2.16 | Paste a valid image URL into Logo field | Field accepts it | |
| 2.17 | Paste valid image URLs into Photo URLs | Field accepts them | |
| 2.18 | Skip all fields and click Next | Allowed — photos are optional | |
| 2.19 | Click Next → advances to Step 5 | Step 5 "Launch page" shown | |
| **Step 5 — Launch Page Preview** | | | |
| 2.20 | Preview of the lead capture page renders | Business name, offer text, and CTA visible in preview | |
| 2.21 | Public slug shown (e.g. `/p/my-business/...`) | Readable, URL-safe slug generated from business name | |
| 2.22 | Click "Launch" / "Finish" | Onboarding marked complete; redirected to `/leads` or dashboard | |
| 2.23 | Visiting `/get-started` again after completion | Redirects away (to `/leads`) — can't re-run wizard | |

---

## Section 3 — Lead Capture Page (Public)

> The public lead page lives at `/p/[tenantSlug]/[pageSlug]`. Get the URL from Step 5 of onboarding or Settings → Account.

| # | Test Step | Expected Result | Result / Notes |
|---|---|---|---|
| 3.1 | Open lead page URL in incognito / while signed out | Page loads with business name, offer, and contact form — no auth required | |
| 3.2 | Submit form with name only (email + phone blank) | Submission accepted; thanks message or redirect shown | |
| 3.3 | Submit form with name + valid email | Submission accepted | |
| 3.4 | Submit form with name + invalid email (e.g. "notanemail") | Validation error shown; submission rejected | |
| 3.5 | Submit form with name + phone number | Submission accepted | |
| 3.6 | Submit the form twice rapidly | Rate limit kicks in on the second attempt (429) or a user-friendly message shown | |
| 3.7 | Check Leads page (`/leads`) after submission | New lead appears in the list | |
| 3.8 | Lead page looks correct on mobile screen size | Layout is responsive; form usable on small screen | |

---

## Section 4 — Leads Management

> URL: `/leads`

| # | Test Step | Expected Result | Result / Notes |
|---|---|---|---|
| 4.1 | `/leads` loads after onboarding | List of leads shown (or empty state message) | |
| 4.2 | Each lead shows name, email/phone, source, date | Correct data displayed | |
| 4.3 | Change a lead's status to "Contacted" | Status updates immediately | |
| 4.4 | Change status through all options: New → Contacted → Booked → Won → Lost → Archived | Each transition saves correctly | |
| 4.5 | Click Delete on a lead | Inline confirm appears ("Are you sure?") — NOT a browser dialog | |
| 4.6 | Confirm delete | Lead removed from list | |
| 4.7 | Cancel delete | Lead remains; no change | |
| 4.8 | Empty state | If no leads: friendly empty-state message shown (not a blank page) | |

---

## Section 5 — Post Studio (Create & Post)

> URL: `/create`

### 5A — Page Load & Media

| # | Test Step | Expected Result | Result / Notes |
|---|---|---|---|
| 5.1 | Navigate to `/create` | Post Studio loads; loading spinner shown briefly then content appears | |
| 5.2 | Media panel is visible | Upload button and empty media library shown | |
| 5.3 | Upload an image (JPG/PNG/WEBP, under 50 MB) | Image appears in media library; auto-selected | |
| 5.4 | Upload a video (MP4, under 50 MB) | Video thumbnail appears in library | |
| 5.5 | Upload a file with disallowed type (e.g. .exe, .pdf) | Error message: "Unsupported file type" | |
| 5.6 | Upload a file over 50 MB | Error message: "File is too large" | |
| 5.7 | Select an uploaded image | Image appears in platform preview on the right | |
| 5.8 | Delete an uploaded image | Confirm prompt appears; image removed from library | |
| 5.9 | Media library persists across page refreshes | Previously uploaded images still appear | |

### 5B — Copy & Platform

| # | Test Step | Expected Result | Result / Notes |
|---|---|---|---|
| 5.10 | Platform selector (Instagram / Facebook) | Switching platform updates preview and validation rules | |
| 5.11 | Type a hook, caption, and hashtags manually | Fields accept input; character count shown if applicable | |
| 5.12 | Alt text field accepts input | Field available and saves | |
| 5.13 | Platform preview updates as you type | Live preview reflects hook/caption/hashtags | |
| 5.14 | "Copy post" button | Copies formatted text to clipboard; confirmation message shown | |

### 5C — Save & Schedule

| # | Test Step | Expected Result | Result / Notes |
|---|---|---|---|
| 5.15 | "Save draft" button with empty fields | Button disabled — requires at least caption, hook, hashtags, or media | |
| 5.16 | Add a caption and click "Save draft" | Button shows "Saving…" while in flight; success (page refreshes or draft appears in list) | |
| 5.17 | Double-click "Save draft" rapidly | Only one draft created (button disabled during submission) | |
| 5.18 | Resume a saved draft | Draft appears in drafts list; clicking it populates Studio | |
| 5.19 | Delete a draft | Confirm prompt; draft removed from list | |
| 5.20 | "Schedule post" with no date set | Button disabled | |
| 5.21 | "Schedule post" with no caption | Button disabled | |
| 5.22 | Set a schedule date/time and click "Schedule post" | Button shows "Scheduling…"; success message or redirect | |
| 5.23 | Double-click "Schedule post" rapidly | Only one scheduled post created | |
| 5.24 | Scheduled post appears in Analytics → Posts by status | Counted under "Scheduled" | |

### 5D — Drafts List

| # | Test Step | Expected Result | Result / Notes |
|---|---|---|---|
| 5.25 | Drafts list shows saved drafts | List visible on `/create` page sidebar/panel | |
| 5.26 | Active (resumed) draft is visually highlighted | Clear visual distinction from other drafts | |
| 5.27 | Switching between drafts | Studio state resets to selected draft's content | |

---

## Section 6 — AI Features

> Requires API keys added in Settings → API Keys. Test each provider independently.

### 6A — Anthropic API Key (AI Copy Generation + Copilot)

| # | Test Step | Expected Result | Result / Notes |
|---|---|---|---|
| 6.1 | Go to Settings → API Keys | Three provider cards shown (Anthropic, OpenAI, ElevenLabs) | |
| 6.2 | Enter an invalid Anthropic key (wrong format) | "Add" blocked or an error shown | |
| 6.3 | Enter a valid Anthropic key (starts with `sk-ant-`) | Key saved; "last 4" characters shown; source shows "tenant" | |
| 6.4 | Return to `/create`, click "Generate copy with AI" | AI generates hook, caption, hashtags, alt text; fields populate | |
| 6.5 | Switch platform (Instagram ↔ Facebook) then generate | Output adapts to platform | |
| 6.6 | Add an optional photo description and generate | AI incorporates the description | |
| 6.7 | Generate with no photo description | AI still generates generic copy | |
| 6.8 | AI Copilot chat (sidebar) — type a question | Response streams in | |
| 6.9 | Copilot uses business context | References your business name or offer | |
| 6.10 | Remove Anthropic key | Key removed; fallback reply shown in copilot instead of AI response | |

### 6B — OpenAI API Key (AI Image Generation)

| # | Test Step | Expected Result | Result / Notes |
|---|---|---|---|
| 6.11 | Enter a valid OpenAI key (starts with `sk-`) | Key saved with last 4 shown | |
| 6.12 | In Studio → Enhance tools → Generate image | Text prompt field appears | |
| 6.13 | Enter a prompt and click Generate | Image generated and added to media library; auto-selected | |
| 6.14 | Generated image appears in platform preview | Preview updates with new image | |
| 6.15 | Remove OpenAI key | "Add your OpenAI API key" message shown instead of generate button | |

### 6C — ElevenLabs API Key (AI Voiceover)

| # | Test Step | Expected Result | Result / Notes |
|---|---|---|---|
| 6.16 | Enter a valid ElevenLabs API key | Key saved with last 4 shown | |
| 6.17 | In Studio → Enhance tools → Generate voiceover | Voiceover generated from caption text; audio asset added | |
| 6.18 | Audio asset appears in media library | Audio file visible | |
| 6.19 | Remove ElevenLabs key | "Add your ElevenLabs API key" message shown | |

---

## Section 7 — Social Media Connections

> Settings → Connections. Each OAuth flow requires the respective app credentials configured in Vercel env vars.

### 7A — Facebook & Instagram (Meta)

| # | Test Step | Expected Result | Result / Notes |
|---|---|---|---|
| 7.1 | Go to Settings → Connections | Meta, TikTok, Canva connection cards visible | |
| 7.2 | Click "Connect Facebook / Instagram" | Redirected to Facebook OAuth consent screen | |
| 7.3 | Approve permissions on Facebook | Redirected back to app; success banner shown | |
| 7.4 | Settings → Connections shows Facebook as Connected | Green/connected status indicator | |
| 7.5 | Settings → Connections shows Instagram as Connected (if IG business account linked to the FB page) | Green/connected status | |
| 7.6 | Click "Disconnect" on Facebook connection | Confirmation; connection removed | |
| 7.7 | Reconnect after disconnect | OAuth flow works again | |
| 7.8 | Schedule a post to Instagram (requires connection) | Post enters Scheduled state | |
| 7.9 | Wait for Inngest cron (every 5 min) or trigger manually | Post status changes to Published; post appears on Instagram | |
| 7.10 | Schedule a post to Facebook | Same publish flow works for Facebook | |

### 7B — TikTok

| # | Test Step | Expected Result | Result / Notes |
|---|---|---|---|
| 7.11 | Click "Connect TikTok" | Redirected to TikTok OAuth consent screen | |
| 7.12 | Approve permissions | Redirected back; success banner shown | |
| 7.13 | TikTok shows as Connected | Connection status shows connected | |
| 7.14 | "Copy post" for a TikTok post | Copies text; message says "Open TikTok, upload your video, and paste the caption" | |
| 7.15 | Disconnect TikTok | Connection removed | |

### 7C — Canva (Optional)

| # | Test Step | Expected Result | Result / Notes |
|---|---|---|---|
| 7.16 | Click "Connect Canva" (if Canva credentials configured) | Redirected to Canva OAuth | |
| 7.17 | Approve Canva permissions | Redirected back; Canva connected | |
| 7.18 | In Studio → "Edit in Canva" | Canva design opens in new tab | |
| 7.19 | Design in Canva and return | (Optional: verify design can be imported back) | |

---

## Section 8 — Auto-Replies

> URL: `/auto-replies`. Requires Instagram connected via Meta OAuth.

| # | Test Step | Expected Result | Result / Notes |
|---|---|---|---|
| 8.1 | Navigate to `/auto-replies` | Three preset cards shown: Comment Info, Welcome DM, Comment Link | |
| 8.2 | **Comment Info** preset is shown with toggle | Toggle shows current state (on/off) | |
| 8.3 | Toggle Comment Info ON | Setting saves; banner "Auto-reply setting saved" appears | |
| 8.4 | Toggle Comment Info OFF | Setting saves; banner appears | |
| 8.5 | **Welcome DM** preset visible | Toggle and description shown | |
| 8.6 | Toggle Welcome DM ON | Saves correctly | |
| 8.7 | **Comment Link** preset visible | Toggle and description shown | |
| 8.8 | Toggle Comment Link ON | Saves correctly | |
| 8.9 | Preset descriptions reference your lead page URL | Your actual `/p/...` URL shown in the preview | |
| 8.10 | Comment on your IG post with "INFO" (live test) | Bot auto-replies with your lead page link (within ~1 min) | |
| 8.11 | DM your IG account for the first time (live test) | Welcome DM received (within ~1 min) | |
| 8.12 | DM again from same account | No second welcome DM sent (first-contact-only) | |
| 8.13 | Same comment/message delivered twice by Meta | Only one auto-reply sent (dedup working) | |

---

## Section 9 — Brand Settings

> URL: `/settings/brand`

| # | Test Step | Expected Result | Result / Notes |
|---|---|---|---|
| 9.1 | Navigate to `/settings/brand` | Page loads; photo upload panel visible | |
| 9.2 | Upload a brand photo (image file) | Photo appears in brand photo grid | |
| 9.3 | Upload up to 6 photos | All accepted; 7th upload rejected with a message | |
| 9.4 | Delete a brand photo | Photo removed from grid | |
| 9.5 | Brand photos available in Post Studio media library | Uploaded brand photos appear in `/create` media panel | |

---

## Section 10 — Analytics

> URL: `/analytics`

| # | Test Step | Expected Result | Result / Notes |
|---|---|---|---|
| 10.1 | Navigate to `/analytics` | Page loads with stat cards and breakdown charts | |
| 10.2 | "Total leads" stat card shows correct count | Matches number of leads in `/leads` | |
| 10.3 | "Open leads" shows new + contacted + booked | Correct subset | |
| 10.4 | "Won" shows won leads count | Correct | |
| 10.5 | "Posts published" count is correct | Matches published posts | |
| 10.6 | Leads by status breakdown bar chart | Each status (New, Contacted, Booked, Won, Lost, Archived) shown with count and bar | |
| 10.7 | Posts by status breakdown | Draft, Scheduled, Published, Copied, Failed shown | |
| 10.8 | Engagement events breakdown | Page views, clicks, form submits, bookings, DMs shown | |
| 10.9 | "X new this week" hint on Total Leads | Correct count for leads created in last 7 days | |
| 10.10 | Stats update after adding a new lead via the public form | Refresh analytics; total increases | |
| 10.11 | Stats update after publishing a post | Published count increases | |

---

## Section 11 — Settings Pages

### 11A — Account Settings

| # | Test Step | Expected Result | Result / Notes |
|---|---|---|---|
| 11.1 | Navigate to `/settings/account` | Account info visible | |
| 11.2 | Business details shown (name, goal, offer) | Reflects onboarding data | |

### 11B — API Keys

| # | Test Step | Expected Result | Result / Notes |
|---|---|---|---|
| 11.3 | Navigate to `/settings/api-keys` | Three provider cards: Anthropic, OpenAI, ElevenLabs | |
| 11.4 | Source label shows "env" when key set via env var | "From environment" or similar | |
| 11.5 | Source label shows "tenant" when key set via UI | "Your key" or similar | |
| 11.6 | Tenant key takes priority over env key | UI key used even if env var is set | |
| 11.7 | Remove a tenant key | Falls back to env key (if set) | |

### 11C — Connections

| # | Test Step | Expected Result | Result / Notes |
|---|---|---|---|
| 11.8 | Navigate to `/settings/connections` | Meta, TikTok, Canva cards shown with connection status | |
| 11.9 | Unknown `?error=` param in URL | Safe generic message shown — not the raw URL param | |

---

## Section 12 — Navigation & General UX

| # | Test Step | Expected Result | Result / Notes |
|---|---|---|---|
| 12.1 | All nav links work: Leads, Create, Auto-Replies, Analytics, Settings | Each page loads without error | |
| 12.2 | AI Helper floating button (non-/create pages) | FAB visible; opens chat panel on click | |
| 12.3 | AI Helper chat sends and receives messages | Chat works end-to-end (with Anthropic key) | |
| 12.4 | AI Helper hidden on `/create` page | FAB not shown on Create & Post (embedded copilot used instead) | |
| 12.5 | Flash banners / success messages appear and are readable | Not persisting after browser refresh | |
| 12.6 | App loads correctly on mobile viewport (375px width) | No overflow; nav usable; forms functional | |
| 12.7 | App loads correctly on tablet viewport (768px) | Layout adapts appropriately | |
| 12.8 | Dark mode (if supported by OS preference) | UI switches to dark theme; text readable | |
| 12.9 | Unhandled error (e.g. force a bad route) | Custom error boundary shown — not Next.js white screen | |
| 12.10 | Browser back/forward navigation | No blank pages or broken state | |
| 12.11 | Refresh on any protected page while signed in | Page reloads correctly (no auth loop) | |

---

## Section 13 — End-to-End User Journey

> Run this as a complete walkthrough — the "happy path" for a new small business owner.

| # | Step | Expected Result | Result / Notes |
|---|---|---|---|
| 13.1 | Sign up with a new email | Account created | |
| 13.2 | Complete all 5 onboarding steps | Redirected to Leads dashboard | |
| 13.3 | Open lead page in incognito; submit a lead | Lead appears in Leads list | |
| 13.4 | Change lead status to Contacted | Status saved | |
| 13.5 | Go to Create; upload a photo | Photo in library | |
| 13.6 | Add Anthropic API key in Settings | Key saved | |
| 13.7 | Generate AI copy for Instagram | Hook, caption, hashtags populate | |
| 13.8 | Save as draft | Draft saved | |
| 13.9 | Connect Facebook/Instagram via Meta OAuth | Connected status shown | |
| 13.10 | Return to draft; schedule post 10 min from now | Post enters Scheduled state | |
| 13.11 | Check Analytics | Lead count = 1, post scheduled count = 1 | |
| 13.12 | Wait for Inngest cron to fire | Post published to Instagram; Analytics published count = 1 | |
| 13.13 | Enable "Comment Info" auto-reply | Toggle on; setting saved | |
| 13.14 | Comment "INFO" on the published IG post from another account | Auto-reply received within ~1 min | |

---

## Bug Log

Use this table to track any failures found during testing.

| # | Section | Test # | Description | Severity (High/Med/Low) | Status |
|---|---|---|---|---|---|
| | | | | | |
| | | | | | |
| | | | | | |

---

## Sign-off

| Tester | Date | Environment | Overall Result |
|---|---|---|---|
| | | | ☐ Ready ☐ Needs fixes |

---

*Generated from codebase at commit `f703642`. Update this checklist when new features are added.*
