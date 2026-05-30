import { formatPostForCopy } from "@/lib/ai/generate-post";
import {
  getAccessToken,
  getSocialAccountForTenant,
} from "@/lib/social-accounts";
import { tiktokApiRequest } from "@/lib/tiktok/config";
import type { PostRecord } from "@/lib/posts";

export async function publishPostToTikTok(post: PostRecord) {
  const account = await getSocialAccountForTenant(post.tenantId, "tiktok");

  if (!account || account.status !== "connected") {
    throw new Error("TikTok is not connected");
  }

  if (!post.mediaUrl) {
    throw new Error(
      "TikTok posts need a public video URL. Use Copy post to publish manually for now.",
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
    "tiktok",
  );

  const initResponse = await tiktokApiRequest<{
    data?: { publish_id?: string };
  }>("/v2/post/publish/video/init/", accessToken, {
    method: "POST",
    body: JSON.stringify({
      post_info: {
        title: caption.slice(0, 2200),
        privacy_level: "PUBLIC_TO_EVERYONE",
        disable_duet: false,
        disable_comment: false,
        disable_stitch: false,
      },
      source_info: {
        source: "PULL_FROM_URL",
        video_url: post.mediaUrl,
      },
    }),
  });

  const publishId = initResponse.data?.publish_id;
  if (!publishId) {
    throw new Error(
      "TikTok did not accept the video. Your app may need Content Posting API approval — use Copy post instead.",
    );
  }

  return publishId;
}
