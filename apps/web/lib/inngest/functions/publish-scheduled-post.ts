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

      let platformPostId: string | undefined;
      try {
        platformPostId = await publishPost(claimed);
      } catch (error) {
        // Publish failed — post is NOT live, safe to mark failed.
        await markPostFailed(claimed.tenantId, claimed.id).catch(() => undefined);
        results.push({
          postId: claimed.id,
          status: "failed",
          error: error instanceof Error ? error.message : "Publish failed",
        });
        continue;
      }

      // Post is live on the platform. Record it — but if the DB update fails,
      // do NOT mark the post as failed (it is published). Log for manual recovery.
      try {
        await markPostPublished(claimed.tenantId, claimed.id, platformPostId);
        results.push({
          postId: claimed.id,
          status: "published",
          platformPostId,
        });
      } catch (dbError) {
        console.error(
          `[publish] markPostPublished failed for post ${claimed.id} (platformPostId=${platformPostId}) — post is live but DB not updated. Manual recovery required.`,
          dbError,
        );
        results.push({
          postId: claimed.id,
          status: "published_unconfirmed",
          platformPostId,
        });
      }
    }

    return { processed: results.length, results };
  },
);
