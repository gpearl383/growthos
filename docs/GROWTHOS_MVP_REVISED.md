# GrowthOS — Owner-First Product Spec (MVP)

**Status:** Current execution plan · May 2026

> **Documentation index:** [README.md](./README.md) · **Shareable plan:** [GROWTHOS_PLAN.html](./GROWTHOS_PLAN.html) · **Engineering:** [GROWTHOS_MVP_TECHNICAL_SPEC.md](./GROWTHOS_MVP_TECHNICAL_SPEC.md)

---

## One-line pitch

**Social media marketing without the marketing degree — content created, posts scheduled, leads captured, and DMs answered for small business owners who don't have time to figure any of this out.**

---

## Who this is for

Small business owners who:

- Use or want to use Instagram, TikTok, Facebook, LinkedIn, or YouTube
- **Do not understand** how to turn social media into customers
- **Do not have time** to learn funnels, DMs, hooks, analytics, or schedulers
- Want someone/something to **just get them started** and keep leads coming in

**This is NOT for:** marketing agencies, social media managers, or people who enjoy configuring tools.

---

## What we're building (product, not analytics)

GrowthOS is an **AI marketing assistant** that:

1. **Asks simple questions** about your business and goal (in plain English)
2. **Creates your content** — posts, captions, hooks, hashtags
3. **Sets up lead capture** — booking page, quote form, or free guide (automatic, not a "funnel builder")
4. **Turns on auto-replies** — when someone comments INFO or DMs you, they get your offer link
5. **Publishes or schedules** posts to your connected accounts
6. **Shows new leads** in an inbox — tap to call, text, or mark booked

**Analytics are not the product.** Owners see a leads inbox and a simple weekly summary ("5 leads this week"). Detailed performance data is optional later for owners who want it.

---

## Product principles

| Principle | Example |
|-----------|---------|
| No jargon | "Get booking requests" not "Optimize conversion funnel" |
| Do it for me | Wizards and presets, not empty dashboards |
| One next step | "Post this" · "Turn on auto-reply" · "You have 2 new leads" |
| 15-minute first win | Live lead page + first post ready in one session |
| Mobile-first | Check leads between jobs on your phone |

---

## MVP features (priority order)

### 1. Get Started wizard
- Business type, goal, offer, logo/photos
- Output: everything configured — owner never sees "brand kit" or "campaign entity"

### 2. AI content creation
- Hooks, captions, hashtags from uploaded photos
- Platform-specific versions (IG vs Facebook vs TikTok caption length)
- Content calendar suggestions with ready-made posts
- Approve or edit in plain text — no design tool required

### 3. Lead page (automatic funnel)
| Goal | What we create |
|------|----------------|
| Get calls / bookings | Calendly embed or booking form |
| Get quote requests | Short form (name, phone, need) |
| Grow email list | Free guide / coupon + thank-you page |

Owner previews on phone: *"This is what customers see when they click your link."*

### 4. DM & comment auto-replies
Preset toggles — no flow builder:
- Comment **INFO** / **PRICE** → auto-DM with offer link
- New DM → welcome message + how can we help
- 3–5 templates per business type; owner picks and turns on

### 5. Publish & schedule (phased platforms)

| Platform | When | Owner experience |
|----------|------|------------------|
| Instagram | MVP (M4) | Connect → schedule or copy-to-post with steps |
| Facebook | MVP (M4) | Same Meta login, cross-post option |
| TikTok | P1.5 (M6–7) | Connect → adapted caption → schedule or copy |
| LinkedIn | Phase 2 | Business page posts |
| YouTube | Phase 2 | Shorts title + description (not video editing) |

### 6. Leads inbox (home screen after setup)
- New leads with name, phone, email, source, time
- Actions: Call · Text · Mark booked · Mark won
- Weekly email: "3 posts published, 5 leads, 2 booked"

### 7. AI helper chat
- "What should I post this week?"
- "How do I get more bookings?"
- Can generate a post or enable a preset in one click

---

## NOT in MVP

- Analytics dashboards, ROAS, A/B testing, attribution reports
- Drag-drop design editor, AI image/video generation
- Visual workflow / funnel builder with branching
- HubSpot sync, paid ads, competitor tools
- Marketing jargon anywhere in the UI

---

## 5-month build plan

| Month | Ship | Owner sees |
|-------|------|------------|
| M1 | Wizard + lead page templates | "I got a live signup page from 5 questions" |
| M2 | AI content + leads inbox | "AI wrote my post; I got a lead notification" |
| M3 | DM auto-replies + AI chat | "INFO comments get my link automatically" |
| M4 | Instagram + Facebook publish | "My posts went live without figuring out IG" |
| M5 | Polish + Stripe + beta | 20 owners live with concierge help |

**P1.5:** TikTok · **Phase 2:** LinkedIn, YouTube Shorts copy, email follow-ups

---

## Success metrics (owner outcomes)

| Metric | Target |
|--------|--------|
| Finish Get Started in one session | 70% |
| First post published within 7 days | 60% |
| Auto-reply turned on | 50% |
| First lead within 30 days | 40% |
| Weekly return to check leads | 50% WAU |
| Beta → paid | 40% |

---

## Pricing

| | |
|---|---|
| **$79/mo** | AI content, IG + FB, lead pages, auto-replies, leads inbox, AI chat |
| **Trial** | 14 days + optional setup call |
| **Annual** | $790/yr after 60 days |

**Marketing:** *"Stop guessing what to post. Get content, leads, and auto-replies set up in one afternoon."*

---

## Core screens

1. **Get Started** — wizard (first visit)
2. **Create & Post** — AI posts, approve, schedule
3. **Leads** — inbox (default home)
4. **Auto-Replies** — simple preset toggles
5. **AI Chat** — floating help

No "Analytics" tab in MVP. No "Campaigns" jargon — use "Your offer" or "This week's posts."

---

## Project location

`~/Documents/growthos/` — separate from csm-website

**First build after scaffold:** Get Started wizard → one lead page → shareable link
