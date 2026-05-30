import { clerkClient } from "@clerk/nextjs/server";
import { eq } from "@growthos/db";
import { leads, tenants } from "@growthos/db";

import { getDb } from "@/lib/db";
import { appUrl, clerkConfigured, dbConfigured } from "@/lib/env";
import { formatLeadSource } from "@/lib/leads";
import { sendNewLeadEmail } from "@/lib/notifications/email";
import { inngest } from "@/lib/inngest/client";

async function resolveOwnerEmail(clerkOrgId: string) {
  if (!clerkConfigured || clerkOrgId === "dev_local_org") {
    return null;
  }

  if (!clerkOrgId.startsWith("org_")) {
    return null;
  }

  try {
    const client = await clerkClient();
    const memberships =
      await client.organizations.getOrganizationMembershipList({
        organizationId: clerkOrgId,
        limit: 10,
      });

    for (const membership of memberships.data) {
      const userId = membership.publicUserData?.userId;
      if (!userId) {
        continue;
      }

      const user = await client.users.getUser(userId);
      const email = user.emailAddresses[0]?.emailAddress;
      if (email) {
        return email;
      }
    }
  } catch {
    return null;
  }

  return null;
}

export const notifyNewLead = inngest.createFunction(
  { id: "notify-new-lead" },
  { event: "growthos/lead.created" },
  async ({ event }) => {
    if (!dbConfigured) {
      return { skipped: "database_not_configured" };
    }

    const db = getDb();

    const lead = await db.query.leads.findFirst({
      where: eq(leads.id, event.data.leadId),
    });

    if (!lead) {
      return { skipped: "lead_not_found" };
    }

    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, lead.tenantId),
    });

    if (!tenant) {
      return { skipped: "tenant_not_found" };
    }

    const ownerEmail = await resolveOwnerEmail(tenant.clerkOrgId);
    if (!ownerEmail) {
      return { skipped: "owner_email_unavailable" };
    }

    const result = await sendNewLeadEmail({
      to: ownerEmail,
      businessName: tenant.businessName ?? "your business",
      leadName: lead.name,
      leadPhone: lead.phone,
      leadEmail: lead.email,
      source: formatLeadSource(lead.source),
      leadsUrl: `${appUrl()}/leads`,
    });

    return result;
  },
);
