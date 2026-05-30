import type { PostRecord } from "@/lib/posts";
import { publishPostToMeta } from "@/lib/meta/publish";
import { publishPostToTikTok } from "@/lib/tiktok/publish";

export async function publishPost(post: PostRecord) {
  switch (post.platform) {
    case "instagram":
    case "facebook":
      return publishPostToMeta(post);
    case "tiktok":
      return publishPostToTikTok(post);
    default:
      throw new Error(`Unsupported platform: ${post.platform satisfies never}`);
  }
}
