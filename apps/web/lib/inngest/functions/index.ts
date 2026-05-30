import { helloWorld } from "@/lib/inngest/functions/hello-world";
import { notifyNewLead } from "@/lib/inngest/functions/notify-new-lead";
import { publishScheduledPosts } from "@/lib/inngest/functions/publish-scheduled-post";

export const functions = [helloWorld, notifyNewLead, publishScheduledPosts];
