# GrowthOS — Executive Summary

*Social media marketing without the marketing degree.*

---

## The Concept

**GrowthOS helps small and local business owners do their social media marketing — without an agency, a big budget, or any jargon.** The target user is a plumber, salon owner, café, or consultant who knows they *should* be marketing online but has no time and no expertise.

The product collapses the entire social-marketing workflow — **create content → capture leads → respond to customers → publish across platforms** — into one plain-English app. Instead of forcing owners to juggle separate tools (Canva, schedulers, CRMs, chatbots), GrowthOS uses **AI to do the work** and **integrates best-in-class third parties** rather than rebuilding them.

It runs fully self-contained for a proof-of-concept (no cloud accounts required) and is architected to scale to production.

---

## What's Been Built

### Foundation
- Multi-tenant app (one workspace per business) on a modern **Next.js 15 / React 19 / TypeScript** monorepo.
- **Local-first POC mode**: embedded database + local file storage means it runs with zero cloud setup. A single switch swaps in cloud infrastructure for production.
- **Graceful degradation**: every integration checks for its API key and shows a setup hint instead of crashing.

### Core Features
- **Onboarding wizard** — captures business type, goal, and offer, then auto-generates a lead page and smart auto-reply templates.
- **AI Post Studio** (the centerpiece) — a single-screen editor dashboard where an owner can:
  - Upload photos/videos into a reusable media library.
  - Get **AI-written copy** (hook, caption, hashtags) and **accessibility alt text**, using **image vision** to "see" the uploaded photo.
  - Preview the post in realistic **Instagram / Facebook / TikTok mockup frames**.
  - Refine with an **inline AI copilot** that sees the live draft ("make the hook stronger," "give me a TikTok version").
  - Save drafts, copy to clipboard, or **schedule** for automatic publishing.
  - Phase-2 creative tools: **AI image generation** (OpenAI), **voiceovers** (ElevenLabs), and **Edit-in-Canva**.
- **Leads inbox** — captures and manages leads from a public lead page, with email notifications.
- **Auto-replies** — keyword-triggered Instagram/Facebook comment & DM responses.
- **Connections** — OAuth to Meta (Instagram/Facebook) and TikTok, with encrypted tokens.
- **Auto-publishing** — a background job publishes scheduled posts to connected platforms every 5 minutes.

### Documentation
- A full **rebuild specification** so the entire app can be recreated from scratch by another team or AI.

---

## Next Steps

### Make It Production-Ready
- Swap local file storage for **cloud storage (Vercel Blob / S3)** so media URLs are publicly reachable — required for live publishing to Meta/TikTok.
- Move from the embedded database to **managed Postgres** and enable **authentication + billing** for real multi-tenant use.
- Complete the **Canva round-trip** (export finished designs back into the media library) and harden TikTok/Meta publishing (video, multi-image).

### Deepen the Product
- **Analytics dashboard** — turn captured events and tracking links into reach / clicks / leads reporting so owners see what's working.
- **Content calendar** — a visual schedule of upcoming and past posts.
- **AI strategy assistant** — proactive "what to post this week" suggestions based on goals and lead trends.
- **Audio/video muxing** — combine voiceovers with video for Reels/TikTok.

### Polish & Trust
- Per-platform validation (caption limits, aspect ratios) before scheduling.
- Onboarding nudges and empty-state guidance to drive first-post completion.
- Expanded test coverage and an end-to-end smoke test through the publish pipeline.

> **Recommended immediate priority:** wire up **cloud media storage + a managed database**. These two unblock actual publishing to live social accounts — the moment the POC becomes a usable product.

---

*Status: Proof-of-concept complete and running locally. Core create-and-publish workflow, leads, auto-replies, and platform connections are functional.*
