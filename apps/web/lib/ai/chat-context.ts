import { and, count, eq, gte } from "@growthos/db";
import { leads, posts } from "@growthos/db";

import { getDb } from "@/lib/db";
import type { TenantRecord } from "@/lib/tenant";

export async function buildChatContext(tenant: TenantRecord) {
  const db = getDb();
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [leadCountRow] = await db
    .select({ value: count() })
    .from(leads)
    .where(eq(leads.tenantId, tenant.id));

  const [recentLeadsRow] = await db
    .select({ value: count() })
    .from(leads)
    .where(and(eq(leads.tenantId, tenant.id), gte(leads.createdAt, weekAgo)));

  const scheduledPosts = await db.query.posts.findMany({
    where: eq(posts.tenantId, tenant.id),
  });

  const scheduledThisWeek = scheduledPosts.filter(
    (post) =>
      post.status === "scheduled" &&
      post.scheduledAt &&
      post.scheduledAt >= weekAgo,
  ).length;

  return {
    businessName: tenant.businessName ?? "your business",
    businessType: tenant.businessType ?? "local business",
    goal: tenant.goal ?? "get customers",
    offerText: tenant.offerText ?? "Helpful local service",
    totalLeads: leadCountRow?.value ?? 0,
    leadsThisWeek: recentLeadsRow?.value ?? 0,
    scheduledThisWeek,
    draftCount: scheduledPosts.filter((post) => post.status === "draft").length,
  };
}

export type StudioContext = {
  platform: string;
  hook: string;
  caption: string;
  hashtags: string;
  altText: string;
  mediaUrl: string;
};

export function buildChatSystemPrompt(
  context: Awaited<ReturnType<typeof buildChatContext>>,
  studio?: StudioContext | null,
) {
  const base = `You are GrowthOS, a friendly AI marketing assistant for small business owners.
Use plain English. No jargon like funnel, ROAS, or conversion rate.
Suggest one clear next step at a time.
You can recommend: creating a post, turning on auto-replies, sharing the lead page, or checking leads.

Business context:
- Name: ${context.businessName}
- Type: ${context.businessType}
- Goal: ${context.goal}
- Offer: ${context.offerText}
- Total leads: ${context.totalLeads}
- Leads this week: ${context.leadsThisWeek}
- Scheduled posts this week: ${context.scheduledThisWeek}
- Draft posts saved: ${context.draftCount}`;

  if (!studio) {
    return `${base}

Keep answers short (2-4 sentences unless asked for a post draft).`;
  }

  return `${base}

You are helping the owner refine THIS specific post inside the Post Studio. Suggest concrete improvements: stronger hooks, tighter captions, better hashtags, alt text, and platform-specific advice. When asked to rewrite, return the new text directly so they can paste it in.

Current draft:
- Platform: ${studio.platform}
- Hook: ${studio.hook || "(empty)"}
- Caption: ${studio.caption || "(empty)"}
- Hashtags: ${studio.hashtags || "(empty)"}
- Alt text: ${studio.altText || "(empty)"}
- Has media attached: ${studio.mediaUrl ? "yes" : "no"}

Keep answers short and actionable (2-5 sentences unless asked to rewrite the post).`;
}
