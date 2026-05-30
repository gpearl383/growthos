import { and, eq } from "@growthos/db";
import { leadPages, tenants } from "@growthos/db";

import { getDb } from "@/lib/db";
import { appUrl, dbConfigured } from "@/lib/env";

export async function getPublishedLeadPage(tenantSlug: string, pageSlug: string) {
  if (!dbConfigured) {
    return null;
  }

  const db = getDb();

  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.slug, tenantSlug),
  });

  if (!tenant) {
    return null;
  }

  const page = await db.query.leadPages.findFirst({
    where: and(
      eq(leadPages.tenantId, tenant.id),
      eq(leadPages.publicSlug, pageSlug),
      eq(leadPages.published, true),
    ),
  });

  if (!page) {
    return null;
  }

  return { tenant, page };
}

export async function getLeadPageUrlForTenant(tenantId: string) {
  if (!dbConfigured) {
    return null;
  }

  const db = getDb();

  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.id, tenantId),
  });

  if (!tenant) {
    return null;
  }

  const page = await db.query.leadPages.findFirst({
    where: and(
      eq(leadPages.tenantId, tenantId),
      eq(leadPages.published, true),
    ),
  });

  const pageSlug = page?.publicSlug ?? "offer";
  return `${appUrl()}/p/${tenant.slug}/${pageSlug}`;
}
