import { and, eq } from "@growthos/db";
import { socialAccounts } from "@growthos/db";

import { getDb } from "@/lib/db";
import { decryptToken, encryptToken } from "@/lib/meta/token-crypto";
import type { SocialPlatform } from "@/lib/platforms";

export type SocialAccountRecord = typeof socialAccounts.$inferSelect;

export async function listSocialAccountsForTenant(tenantId: string) {
  const db = getDb();

  return db.query.socialAccounts.findMany({
    where: eq(socialAccounts.tenantId, tenantId),
  });
}

export async function getSocialAccountForTenant(
  tenantId: string,
  platform: SocialPlatform,
) {
  const db = getDb();

  return db.query.socialAccounts.findFirst({
    where: and(
      eq(socialAccounts.tenantId, tenantId),
      eq(socialAccounts.platform, platform),
    ),
  });
}

export async function getSocialAccountByPlatformUserId(platformUserId: string) {
  const db = getDb();

  return db.query.socialAccounts.findFirst({
    where: eq(socialAccounts.platformUserId, platformUserId),
  });
}

export async function upsertSocialAccount(input: {
  tenantId: string;
  platform: SocialPlatform;
  platformUserId: string;
  accessToken: string;
  tokenExpiresAt?: Date | null;
}) {
  const db = getDb();
  const encrypted = encryptToken(input.accessToken);

  const existing = await getSocialAccountForTenant(
    input.tenantId,
    input.platform,
  );

  if (existing) {
    const [updated] = await db
      .update(socialAccounts)
      .set({
        platformUserId: input.platformUserId,
        accessTokenEnc: encrypted,
        tokenExpiresAt: input.tokenExpiresAt ?? null,
        status: "connected",
        lastError: null,
        updatedAt: new Date(),
      })
      .where(and(eq(socialAccounts.id, existing.id), eq(socialAccounts.tenantId, input.tenantId)))
      .returning();

    return updated;
  }

  const [created] = await db
    .insert(socialAccounts)
    .values({
      tenantId: input.tenantId,
      platform: input.platform,
      platformUserId: input.platformUserId,
      accessTokenEnc: encrypted,
      tokenExpiresAt: input.tokenExpiresAt ?? null,
      status: "connected",
    })
    .returning();

  return created;
}

export async function disconnectSocialAccount(
  tenantId: string,
  platform: SocialPlatform,
) {
  const db = getDb();

  await db
    .delete(socialAccounts)
    .where(
      and(
        eq(socialAccounts.tenantId, tenantId),
        eq(socialAccounts.platform, platform),
      ),
    );
}

export function getAccessToken(account: SocialAccountRecord) {
  return decryptToken(account.accessTokenEnc);
}

export function formatConnectionStatus(status: SocialAccountRecord["status"]) {
  const labels: Record<SocialAccountRecord["status"], string> = {
    connected: "Connected",
    expired: "Reconnect needed",
    error: "Connection error",
  };

  return labels[status];
}
