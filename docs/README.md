# GrowthOS Documentation

**Status:** Live · deployed at https://growthos-blond.vercel.app

## Source of truth

| Document | Audience | Description |
|----------|----------|-------------|
| **[OPERATIONS.md](./OPERATIONS.md)** | Operators (you, future you, anyone running it) | **Live runbook** — every URL, env var, integration status, recovery procedure, known gotcha. Update this when infra changes. |
| **[INTEGRATIONS_SETUP_GUIDE.md](./INTEGRATIONS_SETUP_GUIDE.md)** | Operators setting up APIs | **Step-by-step integration setup** — Clerk, Supabase, AI keys, Meta/IG/FB, TikTok, Canva, Inngest, Resend, Upstash. Checkbox format like QA checklist. |
| **[QA_TESTING_CHECKLIST.md](./QA_TESTING_CHECKLIST.md)** | QA / validation | End-to-end test checklist after setup is complete |
| [GROWTHOS_EXECUTIVE_SUMMARY.md](./GROWTHOS_EXECUTIVE_SUMMARY.md) | Stakeholders | What GrowthOS is + why it exists |
| [GROWTHOS_REBUILD_SPEC.md](./GROWTHOS_REBUILD_SPEC.md) | Engineers (esp. an AI rebuilding from scratch) | Full architectural deep-dive — schema, routes, components, security |
| [GROWTHOS_MVP_TECHNICAL_SPEC.md](./GROWTHOS_MVP_TECHNICAL_SPEC.md) | Engineers | Original MVP technical spec (stack, schema, Meta API, Inngest, env vars) |
| [GROWTHOS_MVP_REVISED.md](./GROWTHOS_MVP_REVISED.md) | Quick reference | Markdown summary of MVP scope |
| [GROWTHOS_PLAN.html](./GROWTHOS_PLAN.html) | Stakeholders, partners | Primary product plan (HTML rendering) |

## Agent memory

- [`../CLAUDE.md`](../CLAUDE.md) — auto-loaded by Claude sessions
- [`../AGENTS.md`](../AGENTS.md) — auto-loaded by Codex / other agents
- [`../.cursor/rules/growthos-operations.mdc`](../.cursor/rules/growthos-operations.mdc) — Cursor always-attached rule

All three point at [`OPERATIONS.md`](./OPERATIONS.md) as their source of truth — keep that file current and the agent memory stays current automatically.

## Project location

```
~/Documents/growthos/
```

Greenfield monorepo (pnpm + Turborepo) — separate from csm-website.
