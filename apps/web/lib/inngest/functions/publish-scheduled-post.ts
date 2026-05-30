import { inngest } from "@/lib/inngest/client";
import { publishPost } from "@/lib/social/publish";
import {
  listDueScheduledPosts,
  markPostFailed,
  markPostPublished,
} from "@/lib/posts";

export const publishScheduledPosts = inngest.createFunction(
  { id: "publish-scheduled-post" },
  { cron: "*/5 * * * *" },
  async () => {
    const duePosts = await listDueScheduledPosts();
    const results: Array<Record<string, unknown>> = [];

    for (const post of duePosts) {
      try {
        const platformPostId = await publishPost(post);
        await markPostPublished(post.tenantId, post.id, platformPostId);
        results.push({ postId: post.id, status: "published", platformPostId });
      } catch (error) {
        await markPostFailed(post.tenantId, post.id);
        results.push({
          postId: post.id,
          status: "failed",
          error: error instanceof Error ? error.message : "Publish failed",
        });
      }
    }

    return { processed: results.length, results };
  },
);
