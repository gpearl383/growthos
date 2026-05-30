import { inngest } from "@/lib/inngest/client";
import { publishPost } from "@/lib/social/publish";
import {
  claimPostForPublishing,
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
      // Atomic CAS: only the worker that wins this update will publish. If the
      // post was already claimed (status moved out of 'scheduled'), skip it.
      const claimed = await claimPostForPublishing(post.id);
      if (!claimed) {
        results.push({ postId: post.id, status: "skipped" });
        continue;
      }

      try {
        const platformPostId = await publishPost(claimed);
        await markPostPublished(claimed.tenantId, claimed.id, platformPostId);
        results.push({
          postId: claimed.id,
          status: "published",
          platformPostId,
        });
      } catch (error) {
        await markPostFailed(claimed.tenantId, claimed.id);
        results.push({
          postId: claimed.id,
          status: "failed",
          error: error instanceof Error ? error.message : "Publish failed",
        });
      }
    }

    return { processed: results.length, results };
  },
);
