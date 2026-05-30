import { eq } from "@growthos/db";
import { brandAssets } from "@growthos/db";

import { getDb } from "@/lib/db";

export const MAX_BRAND_PHOTOS = 6;

export async function getBrandAssets(tenantId: string) {
  const db = getDb();

  return db.query.brandAssets.findFirst({
    where: eq(brandAssets.tenantId, tenantId),
  });
}

export async function getBrandPhotoUrls(tenantId: string) {
  const brand = await getBrandAssets(tenantId);
  return brand?.photoUrls ?? [];
}

export async function setBrandPhotoUrls(tenantId: string, urls: string[]) {
  const db = getDb();
  const existing = await getBrandAssets(tenantId);

  if (existing) {
    await db
      .update(brandAssets)
      .set({ photoUrls: urls })
      .where(eq(brandAssets.id, existing.id));
    return;
  }

  await db.insert(brandAssets).values({
    tenantId,
    logoUrl: null,
    photoUrls: urls,
  });
}
