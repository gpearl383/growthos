import { and, desc, eq } from "@growthos/db";
import { mediaAssets } from "@growthos/db";

import { getDb } from "@/lib/db";
import type { MediaType } from "@/lib/media/types";

export type MediaAssetRecord = typeof mediaAssets.$inferSelect;

export async function listMediaAssetsForTenant(tenantId: string) {
  const db = getDb();

  return db.query.mediaAssets.findMany({
    where: eq(mediaAssets.tenantId, tenantId),
    orderBy: [desc(mediaAssets.createdAt)],
  });
}

export async function createMediaAsset(input: {
  tenantId: string;
  url: string;
  type: MediaType;
  filename?: string;
  mimeType?: string;
  altText?: string;
  source?: string;
}) {
  const db = getDb();

  const [created] = await db
    .insert(mediaAssets)
    .values({
      tenantId: input.tenantId,
      url: input.url,
      type: input.type,
      filename: input.filename ?? null,
      mimeType: input.mimeType ?? null,
      altText: input.altText?.trim() || null,
      source: input.source ?? "upload",
    })
    .returning();

  return created;
}

export async function getMediaAsset(tenantId: string, id: string) {
  const db = getDb();

  return db.query.mediaAssets.findFirst({
    where: and(eq(mediaAssets.id, id), eq(mediaAssets.tenantId, tenantId)),
  });
}

export async function deleteMediaAsset(tenantId: string, id: string) {
  const db = getDb();

  await db
    .delete(mediaAssets)
    .where(and(eq(mediaAssets.id, id), eq(mediaAssets.tenantId, tenantId)));
}
