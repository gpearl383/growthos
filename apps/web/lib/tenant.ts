import { auth, clerkClient } from "@clerk/nextjs/server";
import { eq } from "@growthos/db";
import { tenants } from "@growthos/db";

import { getDb } from "@/lib/db";
import { clerkConfigured, dbConfigured } from "@/lib/env";
import { slugify, uniqueSlug } from "@/lib/slug";

export type TenantRecord = typeof tenants.$inferSelect;

export async function getAuthOrgId() {
  if (!clerkConfigured) {
    return "dev_local_org";
  }

  const session = await auth();
  const orgId = session.orgId ?? session.userId;

  if (!orgId) {
    throw new Error("Not signed in");
  }

  return orgId;
}

async function resolveOrgLabel(clerkOrgId: string) {
  if (!clerkConfigured || clerkOrgId === "dev_local_org") {
    return { name: "My Business", slug: "my-business" };
  }

  if (clerkOrgId.startsWith("org_")) {
    try {
      const client = await clerkClient();
      const org = await client.organizations.getOrganization({
        organizationId: clerkOrgId,
      });
      return {
        name: org.name,
        slug: org.slug ?? slugify(org.name),
      };
    } catch {
      return { name: "My Business", slug: slugify(clerkOrgId) };
    }
  }

  return { name: "My Business", slug: slugify(clerkOrgId) };
}

async function ensureUniqueTenantSlug(
  baseSlug: string,
  excludeTenantId?: string,
) {
  const db = getDb();
  let candidate = baseSlug || "business";
  let attempt = 0;

  while (attempt < 5) {
    const existing = await db.query.tenants.findFirst({
      where: eq(tenants.slug, candidate),
    });

    if (!existing || existing.id === excludeTenantId) {
      return candidate;
    }

    attempt += 1;
    candidate = uniqueSlug(baseSlug, String(attempt));
  }

  return uniqueSlug(baseSlug, crypto.randomUUID().slice(0, 6));
}

export { ensureUniqueTenantSlug };

export async function getOrCreateTenant(): Promise<TenantRecord> {
  if (!dbConfigured) {
    throw new Error("DATABASE_URL is not configured");
  }

  const clerkOrgId = await getAuthOrgId();
  const db = getDb();

  const existing = await db.query.tenants.findFirst({
    where: eq(tenants.clerkOrgId, clerkOrgId),
  });

  if (existing) {
    return existing;
  }

  const org = await resolveOrgLabel(clerkOrgId);
  const slug = await ensureUniqueTenantSlug(org.slug || slugify(org.name));

  const [created] = await db
    .insert(tenants)
    .values({
      clerkOrgId,
      slug,
      businessName: org.name,
      onboardingComplete: false,
      plan: "trial",
    })
    .returning();

  return created;
}

export async function getTenantForOrg(clerkOrgId: string) {
  if (!dbConfigured) {
    return null;
  }

  const db = getDb();
  return db.query.tenants.findFirst({
    where: eq(tenants.clerkOrgId, clerkOrgId),
  });
}

export async function syncTenantFromClerkOrg(input: {
  clerkOrgId: string;
  name: string;
  slug?: string | null;
}) {
  if (!dbConfigured) {
    return null;
  }

  const db = getDb();
  const existing = await getTenantForOrg(input.clerkOrgId);

  if (existing) {
    const [updated] = await db
      .update(tenants)
      .set({
        businessName: existing.businessName ?? input.name,
      })
      .where(eq(tenants.id, existing.id))
      .returning();
    return updated;
  }

  const slug = await ensureUniqueTenantSlug(
    input.slug ?? slugify(input.name) ?? slugify(input.clerkOrgId),
  );

  const [created] = await db
    .insert(tenants)
    .values({
      clerkOrgId: input.clerkOrgId,
      slug,
      businessName: input.name,
      onboardingComplete: false,
      plan: "trial",
    })
    .returning();

  return created;
}
