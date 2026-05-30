import { eq } from "@growthos/db";
import { events, leads, posts } from "@growthos/db";

import { getDb } from "@/lib/db";

export type LeadStatusKey =
  | "new"
  | "contacted"
  | "booked"
  | "won"
  | "lost"
  | "archived";

export type PostStatusKey =
  | "draft"
  | "scheduled"
  | "publishing"
  | "published"
  | "failed"
  | "copied";

export type EventTypeKey =
  | "click"
  | "page_view"
  | "form_submit"
  | "booking"
  | "dm_sent";

export type AnalyticsSummary = {
  leads: {
    total: number;
    thisWeek: number;
    byStatus: Record<LeadStatusKey, number>;
    open: number;
    won: number;
  };
  posts: {
    total: number;
    byStatus: Record<PostStatusKey, number>;
  };
  events: {
    total: number;
    thisWeek: number;
    byType: Record<EventTypeKey, number>;
  };
};

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function emptyCounts<K extends string>(keys: readonly K[]) {
  return keys.reduce(
    (acc, key) => {
      acc[key] = 0;
      return acc;
    },
    {} as Record<K, number>,
  );
}

const LEAD_STATUSES = [
  "new",
  "contacted",
  "booked",
  "won",
  "lost",
  "archived",
] as const;
const POST_STATUSES = [
  "draft",
  "scheduled",
  "publishing",
  "published",
  "failed",
  "copied",
] as const;
const EVENT_TYPES = [
  "click",
  "page_view",
  "form_submit",
  "booking",
  "dm_sent",
] as const;

export async function getAnalyticsSummary(
  tenantId: string,
): Promise<AnalyticsSummary> {
  const db = getDb();
  const weekAgo = new Date(Date.now() - WEEK_MS);

  const [leadRows, postRows, eventRows] = await Promise.all([
    db.query.leads.findMany({ where: eq(leads.tenantId, tenantId) }),
    db.query.posts.findMany({ where: eq(posts.tenantId, tenantId) }),
    db.query.events.findMany({ where: eq(events.tenantId, tenantId) }),
  ]);

  const leadByStatus = emptyCounts(LEAD_STATUSES);
  let leadsThisWeek = 0;
  for (const lead of leadRows) {
    leadByStatus[lead.status] += 1;
    if (lead.createdAt && lead.createdAt >= weekAgo) {
      leadsThisWeek += 1;
    }
  }

  const postByStatus = emptyCounts(POST_STATUSES);
  for (const post of postRows) {
    postByStatus[post.status] += 1;
  }

  const eventByType = emptyCounts(EVENT_TYPES);
  let eventsThisWeek = 0;
  for (const event of eventRows) {
    eventByType[event.type] += 1;
    if (event.createdAt && event.createdAt >= weekAgo) {
      eventsThisWeek += 1;
    }
  }

  const open =
    leadByStatus.new + leadByStatus.contacted + leadByStatus.booked;

  return {
    leads: {
      total: leadRows.length,
      thisWeek: leadsThisWeek,
      byStatus: leadByStatus,
      open,
      won: leadByStatus.won,
    },
    posts: {
      total: postRows.length,
      byStatus: postByStatus,
    },
    events: {
      total: eventRows.length,
      thisWeek: eventsThisWeek,
      byType: eventByType,
    },
  };
}
