import { formatPostForCopy } from "@/lib/ai/generate-post";
import { graphRequest } from "@/lib/meta/config";
import {
  getAccessToken,
  getSocialAccountForTenant,
} from "@/lib/social-accounts";
import type { PostRecord } from "@/lib/posts";

export async function publishPostToMeta(post: PostRecord) {
  const account = await getSocialAccountForTenant(post.tenantId, post.platform);

  if (!account || account.status !== "connected") {
    throw new Error(
      `${post.platform === "instagram" ? "Instagram" : "Facebook"} is not connected`,
    );
  }

  const accessToken = getAccessToken(account);
  const caption = formatPostForCopy(
    {
      hook: post.hook ?? "",
      caption: post.caption,
      hashtags: post.hashtags ?? "",
      facebookCaption: post.caption,
    },
    post.platform,
  );

  if (post.platform === "instagram") {
    if (!post.mediaUrl) {
      throw new Error("Instagram posts need a public photo URL to publish.");
    }

    const container = await graphRequest<{ id: string }>(
      `/${account.platformUserId}/media`,
      accessToken,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image_url: post.mediaUrl,
          caption,
        }),
      },
    );

    const published = await graphRequest<{ id: string }>(
      `/${account.platformUserId}/media_publish`,
      accessToken,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creation_id: container.id,
        }),
      },
    );

    return published.id;
  }

  const published = await graphRequest<{ id: string }>(
    `/${account.platformUserId}/feed`,
    accessToken,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: caption,
        link: post.mediaUrl ?? undefined,
      }),
    },
  );

  return published.id;
}
