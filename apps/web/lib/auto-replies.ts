import { and, eq } from "@growthos/db";
import { autoReplyPresets } from "@growthos/db";

import { getDb } from "@/lib/db";

export type AutoReplyPresetRecord = typeof autoReplyPresets.$inferSelect;

export const PRESET_META: Record<
  string,
  { title: string; description: string }
> = {
  comment_info: {
    title: "Comment says INFO or PRICE",
    description:
      "When someone comments with INFO, PRICE, or QUOTE, automatically send them your offer link.",
  },
  welcome_dm: {
    title: "New direct message",
    description:
      "When someone DMs you for the first time, send a friendly welcome and ask how you can help.",
  },
  comment_link: {
    title: "Comment says LINK",
    description:
      "When someone comments LINK, automatically reply with your offer page.",
  },
};

export async function listAutoReplyPresetsForTenant(tenantId: string) {
  const db = getDb();

  return db.query.autoReplyPresets.findMany({
    where: eq(autoReplyPresets.tenantId, tenantId),
    orderBy: (presets, { asc }) => [asc(presets.presetKey)],
  });
}

export async function setAutoReplyPresetEnabled(
  tenantId: string,
  presetId: string,
  enabled: boolean,
) {
  const db = getDb();

  const [updated] = await db
    .update(autoReplyPresets)
    .set({ enabled, updatedAt: new Date() })
    .where(
      and(
        eq(autoReplyPresets.id, presetId),
        eq(autoReplyPresets.tenantId, tenantId),
      ),
    )
    .returning();

  return updated ?? null;
}

export function renderPresetMessage(
  template: string,
  input: { businessName?: string | null; link?: string | null },
) {
  return template
    .replaceAll("{business}", input.businessName?.trim() || "our team")
    .replaceAll("{link}", input.link?.trim() || "your link");
}

export function formatPresetTitle(presetKey: string) {
  return PRESET_META[presetKey]?.title ?? presetKey.replaceAll("_", " ");
}

export function formatPresetDescription(presetKey: string) {
  return (
    PRESET_META[presetKey]?.description ??
    "Automatically reply when this trigger happens."
  );
}
