import { and, desc, eq, isNotNull, lte } from "@growthos/db";
import { posts } from "@growthos/db";

import { getDb } from "@/lib/db";
import type { PostPlatform } from "@/lib/ai/generate-post";

export type PostRecord = typeof posts.$inferSelect;

export async function listPostsForTenant(tenantId: string) {
  const db = getDb();

  return db.query.posts.findMany({
    where: eq(posts.tenantId, tenantId),
    orderBy: [desc(posts.createdAt)],
  });
}

type MediaType = "image" | "video" | "audio";

export async function savePostDraft(input: {
  tenantId: string;
  caption: string;
  hook?: string;
  hashtags?: string;
  mediaUrl?: string;
  altText?: string;
  mediaType?: MediaType;
  audioUrl?: string;
  platform: PostPlatform;
}) {
  const db = getDb();

  const [created] = await db
    .insert(posts)
    .values({
      tenantId: input.tenantId,
      caption: input.caption.trim(),
      hook: input.hook?.trim() || null,
      hashtags: input.hashtags?.trim() || null,
      mediaUrl: input.mediaUrl?.trim() || null,
      altText: input.altText?.trim() || null,
      mediaType: input.mediaType ?? null,
      audioUrl: input.audioUrl?.trim() || null,
      platform: input.platform,
      status: "draft",
    })
    .returning();

  return created;
}

export async function schedulePost(input: {
  tenantId: string;
  caption: string;
  hook?: string;
  hashtags?: string;
  mediaUrl?: string;
  altText?: string;
  mediaType?: MediaType;
  audioUrl?: string;
  platform: PostPlatform;
  scheduledAt: Date;
}) {
  const db = getDb();

  const [created] = await db
    .insert(posts)
    .values({
      tenantId: input.tenantId,
      caption: input.caption.trim(),
      hook: input.hook?.trim() || null,
      hashtags: input.hashtags?.trim() || null,
      mediaUrl: input.mediaUrl?.trim() || null,
      altText: input.altText?.trim() || null,
      mediaType: input.mediaType ?? null,
      audioUrl: input.audioUrl?.trim() || null,
      platform: input.platform,
      status: "scheduled",
      scheduledAt: input.scheduledAt,
    })
    .returning();

  return created;
}

export async function listDueScheduledPosts() {
  const db = getDb();
  const now = new Date();

  return db.query.posts.findMany({
    where: and(
      eq(posts.status, "scheduled"),
      isNotNull(posts.scheduledAt),
      lte(posts.scheduledAt, now),
    ),
  });
}

export async function markPostPublished(
  tenantId: string,
  postId: string,
  platformPostId?: string,
) {
  const db = getDb();

  const [updated] = await db
    .update(posts)
    .set({
      status: "published",
      publishedAt: new Date(),
      platformPostId: platformPostId ?? null,
    })
    .where(and(eq(posts.id, postId), eq(posts.tenantId, tenantId)))
    .returning();

  return updated ?? null;
}

export async function markPostFailed(tenantId: string, postId: string) {
  const db = getDb();

  const [updated] = await db
    .update(posts)
    .set({ status: "failed" })
    .where(and(eq(posts.id, postId), eq(posts.tenantId, tenantId)))
    .returning();

  return updated ?? null;
}

export async function markPostCopied(tenantId: string, postId: string) {
  const db = getDb();

  const [updated] = await db
    .update(posts)
    .set({ status: "copied" })
    .where(and(eq(posts.id, postId), eq(posts.tenantId, tenantId)))
    .returning();

  if (!updated) {
    return null;
  }

  return updated;
}

export async function deletePost(tenantId: string, postId: string) {
  const db = getDb();

  await db
    .delete(posts)
    .where(and(eq(posts.id, postId), eq(posts.tenantId, tenantId)));
}

export function formatPostStatus(status: PostRecord["status"]) {
  const labels: Record<PostRecord["status"], string> = {
    draft: "Draft",
    scheduled: "Scheduled",
    published: "Published",
    failed: "Failed",
    copied: "Copied",
  };

  return labels[status];
}
