import { and, desc, eq } from "@growthos/db";
import { events, leads } from "@growthos/db";

import { getDb } from "@/lib/db";
import { getPublishedLeadPage } from "@/lib/lead-pages";
import { emitLeadCreated } from "@/lib/inngest/client";

export type LeadRecord = typeof leads.$inferSelect;
export type LeadStatus = LeadRecord["status"];

export async function createLeadFromForm(input: {
  tenantSlug: string;
  pageSlug: string;
  name: string;
  email?: string;
  phone?: string;
}) {
  const pageResult = await getPublishedLeadPage(input.tenantSlug, input.pageSlug);

  if (!pageResult) {
    return { error: "Lead page not found" as const };
  }

  const db = getDb();

  const [lead] = await db
    .insert(leads)
    .values({
      tenantId: pageResult.tenant.id,
      name: input.name.trim(),
      email: input.email?.trim() || null,
      phone: input.phone?.trim() || null,
      source: "form",
      status: "new",
    })
    .returning();

  await db.insert(events).values({
    tenantId: pageResult.tenant.id,
    type: "form_submit",
    leadId: lead.id,
    metadata: {
      pageSlug: input.pageSlug,
      leadPageId: pageResult.page.id,
    },
  });

  await emitLeadCreated({
    leadId: lead.id,
    tenantId: pageResult.tenant.id,
  });

  return { lead, tenant: pageResult.tenant };
}

export async function listLeadsForTenant(tenantId: string) {
  const db = getDb();

  return db.query.leads.findMany({
    where: eq(leads.tenantId, tenantId),
    orderBy: [desc(leads.createdAt)],
  });
}

export async function updateLeadStatus(
  tenantId: string,
  leadId: string,
  status: LeadStatus,
) {
  const db = getDb();

  const [updated] = await db
    .update(leads)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(leads.id, leadId), eq(leads.tenantId, tenantId)))
    .returning();

  if (!updated) {
    return null;
  }

  return updated;
}

export function formatLeadSource(source: string) {
  const labels: Record<string, string> = {
    form: "Lead page",
    instagram: "Instagram",
    facebook: "Facebook",
    tiktok: "TikTok",
    calendly: "Calendly",
    dm: "Direct message",
  };

  return labels[source] ?? source;
}

export function formatLeadStatus(status: LeadStatus) {
  const labels: Record<LeadStatus, string> = {
    new: "New",
    contacted: "Contacted",
    booked: "Booked",
    won: "Won",
    lost: "Lost",
    archived: "Archived",
  };

  return labels[status];
}

export function normalizePhoneForLink(phone: string | null | undefined) {
  if (!phone) {
    return null;
  }

  const digits = phone.replace(/\D/g, "");
  if (!digits) {
    return null;
  }

  return digits.length === 10 ? `+1${digits}` : `+${digits}`;
}
