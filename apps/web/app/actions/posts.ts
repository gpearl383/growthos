"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import {
  formatPostForCopy,
  generatePostContent,
  type PostPlatform,
} from "@/lib/ai/generate-post";
import { dbConfigured } from "@/lib/env";
import {
  deletePost,
  markPostCopied,
  savePostDraft,
  schedulePost,
} from "@/lib/posts";
import { resolveApiKey } from "@/lib/secrets";
import { getOrCreateTenant } from "@/lib/tenant";
import { isSafeFetchUrl } from "@/lib/url-safety";

export type PostActionState = {
  error?: string;
  generated?: {
    hook: string;
    caption: string;
    hashtags: string;
    facebookCaption: string;
    altText: string;
    platform: PostPlatform;
  };
};

const platformSchema = z.enum(["instagram", "facebook", "tiktok"]);
const mediaTypeSchema = z.enum(["image", "video", "audio"]);

export async function generatePost(
  _prev: PostActionState,
  formData: FormData,
): Promise<PostActionState> {
  if (!dbConfigured) {
    return { error: "Database is not configured." };
  }

  const platformResult = platformSchema.safeParse(formData.get("platform"));
  if (!platformResult.success) {
    return { error: "Pick Instagram, Facebook, or TikTok." };
  }

  const tenant = await getOrCreateTenant();
  const photoDescription =
    typeof formData.get("photoDescription") === "string"
      ? formData.get("photoDescription")?.toString()
      : undefined;
  const mediaUrl =
    typeof formData.get("mediaUrl") === "string"
      ? formData.get("mediaUrl")?.toString() || undefined
      : undefined;
  const mediaTypeResult = mediaTypeSchema.safeParse(formData.get("mediaType"));

  if (mediaUrl && !isSafeFetchUrl(mediaUrl)) {
    return { error: "Invalid media URL." };
  }

  const apiKey = await resolveApiKey(tenant.id, "anthropic");

  try {
    const generated = await generatePostContent({
      businessType: tenant.businessType,
      businessName: tenant.businessName,
      offerText: tenant.offerText,
      goal: tenant.goal,
      platform: platformResult.data,
      photoDescription,
      mediaUrl,
      mediaType: mediaTypeResult.success ? mediaTypeResult.data : null,
      apiKey,
    });

    return {
      generated: {
        ...generated,
        platform: platformResult.data,
      },
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not generate post.";
    return { error: message };
  }
}

export async function saveGeneratedPost(formData: FormData) {
  if (!dbConfigured) {
    return;
  }

  // A draft is a work-in-progress, not a publishable post. Allow saving with
  // any meaningful piece filled in — media, hook, caption, or hashtags. The
  // platform validator + scheduling action enforce the stricter "is this
  // actually ready to publish" rules at the right moment.
  const parsed = z
    .object({
      platform: platformSchema,
      hook: z.string().trim().optional(),
      caption: z.string().trim().optional(),
      hashtags: z.string().trim().optional(),
      mediaUrl: z.string().trim().optional(),
      altText: z.string().trim().optional(),
      mediaType: mediaTypeSchema.optional(),
      audioUrl: z.string().trim().optional(),
    })
    .safeParse({
      platform: formData.get("platform"),
      hook: formData.get("hook"),
      caption: formData.get("caption"),
      hashtags: formData.get("hashtags"),
      mediaUrl: formData.get("mediaUrl"),
      altText: formData.get("altText"),
      mediaType: formData.get("mediaType") || undefined,
      audioUrl: formData.get("audioUrl"),
    });

  if (!parsed.success) {
    redirect("/create?error=draft-invalid");
    return;
  }

  const hasContent =
    Boolean(parsed.data.caption) ||
    Boolean(parsed.data.hook) ||
    Boolean(parsed.data.mediaUrl) ||
    Boolean(parsed.data.hashtags);

  if (!hasContent) {
    redirect("/create?error=draft-empty");
    return;
  }

  const tenant = await getOrCreateTenant();

  await savePostDraft({
    tenantId: tenant.id,
    platform: parsed.data.platform,
    hook: parsed.data.hook,
    // posts.caption is NOT NULL at the DB level, but empty string satisfies
    // that — keeps drafts truly partial without a migration.
    caption: parsed.data.caption ?? "",
    hashtags: parsed.data.hashtags,
    mediaUrl: parsed.data.mediaUrl,
    altText: parsed.data.altText,
    mediaType: parsed.data.mediaType,
    audioUrl: parsed.data.audioUrl,
  });

  revalidatePath("/create");
  redirect("/create?saved=draft");
}

export async function scheduleGeneratedPost(formData: FormData) {
  if (!dbConfigured) {
    return;
  }

  const parsed = z
    .object({
      platform: platformSchema,
      hook: z.string().trim().optional(),
      caption: z.string().trim().min(1),
      hashtags: z.string().trim().optional(),
      mediaUrl: z.string().trim().optional(),
      altText: z.string().trim().optional(),
      mediaType: mediaTypeSchema.optional(),
      audioUrl: z.string().trim().optional(),
      scheduledAt: z.string().trim().min(1),
    })
    .safeParse({
      platform: formData.get("platform"),
      hook: formData.get("hook"),
      caption: formData.get("caption"),
      hashtags: formData.get("hashtags"),
      mediaUrl: formData.get("mediaUrl"),
      altText: formData.get("altText"),
      mediaType: formData.get("mediaType") || undefined,
      audioUrl: formData.get("audioUrl"),
      scheduledAt: formData.get("scheduledAt"),
    });

  if (!parsed.success) {
    redirect("/create?error=schedule-invalid");
    return;
  }

  const scheduledAt = new Date(parsed.data.scheduledAt);
  if (Number.isNaN(scheduledAt.getTime()) || scheduledAt.getTime() <= Date.now()) {
    redirect("/create?error=schedule");
    return;
  }

  const tenant = await getOrCreateTenant();

  await schedulePost({
    tenantId: tenant.id,
    platform: parsed.data.platform,
    hook: parsed.data.hook,
    caption: parsed.data.caption,
    hashtags: parsed.data.hashtags,
    mediaUrl: parsed.data.mediaUrl,
    altText: parsed.data.altText,
    mediaType: parsed.data.mediaType,
    audioUrl: parsed.data.audioUrl,
    scheduledAt,
  });

  revalidatePath("/create");
  redirect("/create?saved=scheduled");
}

export async function copyPostDraft(formData: FormData) {
  if (!dbConfigured) {
    return { text: "" };
  }

  const parsed = z
    .object({
      postId: z.string().uuid(),
      platform: platformSchema,
      hook: z.string().optional(),
      caption: z.string(),
      hashtags: z.string().optional(),
    })
    .safeParse({
      postId: formData.get("postId"),
      platform: formData.get("platform"),
      hook: formData.get("hook"),
      caption: formData.get("caption"),
      hashtags: formData.get("hashtags"),
    });

  if (!parsed.success) {
    return { text: "" };
  }

  const tenant = await getOrCreateTenant();
  await markPostCopied(tenant.id, parsed.data.postId);

  revalidatePath("/create");

  return {
    text: formatPostForCopy(
      {
        hook: parsed.data.hook ?? "",
        caption: parsed.data.caption,
        hashtags: parsed.data.hashtags ?? "",
        facebookCaption: parsed.data.caption,
      },
      parsed.data.platform,
    ),
  };
}

export async function deleteDraft(formData: FormData) {
  if (!dbConfigured) {
    return;
  }

  const parsed = z
    .object({ postId: z.string().uuid() })
    .safeParse({ postId: formData.get("postId") });

  if (!parsed.success) {
    return;
  }

  const tenant = await getOrCreateTenant();
  await deletePost(tenant.id, parsed.data.postId);

  revalidatePath("/create");
}
