import { and, eq, gte } from "@growthos/db";
import { events, tenants } from "@growthos/db";

import { getDb } from "@/lib/db";
import { getLeadPageUrlForTenant } from "@/lib/lead-pages";
import {
  formatPresetTitle,
  listAutoReplyPresetsForTenant,
  renderPresetMessage,
} from "@/lib/auto-replies";
import {
  getAccessToken,
  getSocialAccountByPlatformUserId,
} from "@/lib/social-accounts";
import { graphRequest } from "@/lib/meta/config";

const MAX_AUTO_DMS_PER_HOUR = 20;

type MetaCommentValue = {
  id?: string;
  text?: string;
  from?: { id?: string; username?: string };
  media?: { id?: string };
};

type MetaMessagingEvent = {
  sender?: { id?: string };
  recipient?: { id?: string };
  message?: { text?: string; mid?: string };
};

export async function countRecentAutoReplies(tenantId: string) {
  const db = getDb();
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  const recent = await db.query.events.findMany({
    where: and(
      eq(events.tenantId, tenantId),
      eq(events.type, "dm_sent"),
      gte(events.createdAt, oneHourAgo),
    ),
  });

  return recent.length;
}

import { matchesKeywords } from "@/lib/meta/auto-reply-matching";

async function sendInstagramMessage(input: {
  igUserId: string;
  accessToken: string;
  recipientId: string;
  message: string;
}) {
  await graphRequest(
    `/${input.igUserId}/messages`,
    input.accessToken,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipient: { id: input.recipientId },
        message: { text: input.message },
      }),
    },
  );
}

async function sendPrivateReplyToComment(input: {
  commentId: string;
  accessToken: string;
  message: string;
}) {
  await graphRequest(`/${input.commentId}/replies`, input.accessToken, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: input.message }),
  });
}

async function recordAutoReplyEvent(input: {
  tenantId: string;
  metadata: Record<string, unknown>;
}) {
  const db = getDb();
  await db.insert(events).values({
    tenantId: input.tenantId,
    type: "dm_sent",
    metadata: input.metadata,
  });
}

async function processCommentChange(input: {
  igAccountId: string;
  value: MetaCommentValue;
}) {
  const account = await getSocialAccountByPlatformUserId(input.igAccountId);
  if (!account || account.platform !== "instagram" || account.status !== "connected") {
    return { skipped: "account_not_found" };
  }

  const text = input.value.text ?? "";
  const commentId = input.value.id;
  const senderId = input.value.from?.id;

  if (!text || !commentId || !senderId) {
    return { skipped: "missing_comment_data" };
  }

  const recentCount = await countRecentAutoReplies(account.tenantId);
  if (recentCount >= MAX_AUTO_DMS_PER_HOUR) {
    return { skipped: "rate_limited" };
  }

  const presets = await listAutoReplyPresetsForTenant(account.tenantId);
  const leadPageUrl = await getLeadPageUrlForTenant(account.tenantId);
  const db = getDb();
  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.id, account.tenantId),
  });
  const enabledPresets = presets.filter((preset) => preset.enabled);

  const matched = enabledPresets.find((preset) => {
    const keywords = preset.keywords ?? [];
    return keywords.length > 0 && matchesKeywords(text, keywords);
  });

  if (!matched) {
    return { skipped: "no_keyword_match" };
  }

  const message = renderPresetMessage(matched.messageTemplate, {
    businessName: tenant?.businessName,
    link: leadPageUrl,
  });

  const accessToken = getAccessToken(account);

  if (matched.presetKey === "comment_info" || matched.presetKey === "comment_link") {
    await sendPrivateReplyToComment({
      commentId,
      accessToken,
      message,
    });
  } else {
    await sendInstagramMessage({
      igUserId: account.platformUserId,
      accessToken,
      recipientId: senderId,
      message,
    });
  }

  await recordAutoReplyEvent({
    tenantId: account.tenantId,
    metadata: {
      presetKey: matched.presetKey,
      presetTitle: formatPresetTitle(matched.presetKey),
      commentId,
      senderId,
      text,
    },
  });

  return { sent: true, presetKey: matched.presetKey };
}

async function processMessagingEvent(input: {
  igAccountId: string;
  event: MetaMessagingEvent;
}) {
  const account = await getSocialAccountByPlatformUserId(input.igAccountId);
  if (!account || account.platform !== "instagram" || account.status !== "connected") {
    return { skipped: "account_not_found" };
  }

  const senderId = input.event.sender?.id;
  const messageText = input.event.message?.text;

  if (!senderId || !messageText) {
    return { skipped: "missing_message_data" };
  }

  if (senderId === account.platformUserId) {
    return { skipped: "self_message" };
  }

  const recentCount = await countRecentAutoReplies(account.tenantId);
  if (recentCount >= MAX_AUTO_DMS_PER_HOUR) {
    return { skipped: "rate_limited" };
  }

  const presets = await listAutoReplyPresetsForTenant(account.tenantId);
  const welcomePreset = presets.find(
    (preset) => preset.enabled && preset.presetKey === "welcome_dm",
  );

  if (!welcomePreset) {
    return { skipped: "welcome_preset_disabled" };
  }

  const leadPageUrl = await getLeadPageUrlForTenant(account.tenantId);
  const db = getDb();
  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.id, account.tenantId),
  });
  const message = renderPresetMessage(welcomePreset.messageTemplate, {
    businessName: tenant?.businessName,
    link: leadPageUrl,
  });

  await sendInstagramMessage({
    igUserId: account.platformUserId,
    accessToken: getAccessToken(account),
    recipientId: senderId,
    message,
  });

  await recordAutoReplyEvent({
    tenantId: account.tenantId,
    metadata: {
      presetKey: welcomePreset.presetKey,
      senderId,
      messageText,
    },
  });

  return { sent: true, presetKey: welcomePreset.presetKey };
}

export async function processMetaWebhookPayload(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return { skipped: "invalid_payload" };
  }

  const body = payload as {
    object?: string;
    entry?: Array<{
      id?: string;
      changes?: Array<{ field?: string; value?: MetaCommentValue }>;
      messaging?: MetaMessagingEvent[];
    }>;
  };

  if (body.object !== "instagram" || !body.entry?.length) {
    return { skipped: "unsupported_object" };
  }

  const results: unknown[] = [];

  for (const entry of body.entry) {
    const igAccountId = entry.id;
    if (!igAccountId) {
      continue;
    }

    for (const change of entry.changes ?? []) {
      if (change.field === "comments" && change.value) {
        results.push(
          await processCommentChange({
            igAccountId,
            value: change.value,
          }),
        );
      }
    }

    for (const messagingEvent of entry.messaging ?? []) {
      results.push(
        await processMessagingEvent({
          igAccountId,
          event: messagingEvent,
        }),
      );
    }
  }

  return { processed: results.length, results };
}
