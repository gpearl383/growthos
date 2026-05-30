import { eq } from "@growthos/db";
import { tenants } from "@growthos/db";
import { redirect } from "next/navigation";

import { getDb } from "@/lib/db";
import { appUrl, dbConfigured, tiktokConfigured } from "@/lib/env";
import { upsertSocialAccount } from "@/lib/social-accounts";
import {
  exchangeTikTokCodeForToken,
  fetchTikTokUser,
  parseTikTokOAuthState,
} from "@/lib/tiktok/config";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");

  if (error) {
    redirect(
      `/settings/connections?error=${encodeURIComponent(errorDescription ?? error)}`,
    );
  }

  if (!dbConfigured || !tiktokConfigured || !code || !state) {
    redirect("/settings/connections?error=invalid_callback");
  }

  const parsedState = parseTikTokOAuthState(state);
  if (!parsedState) {
    redirect("/settings/connections?error=invalid_state");
  }

  const db = getDb();
  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.id, parsedState.tenantId),
  });

  if (!tenant) {
    redirect("/settings/connections?error=tenant_not_found");
  }

  try {
    const redirectUri = `${appUrl()}/api/tiktok/oauth/callback`;
    const token = await exchangeTikTokCodeForToken(code, redirectUri);
    const user = await fetchTikTokUser(token.access_token);
    const expiresAt = new Date(Date.now() + token.expires_in * 1000);

    await upsertSocialAccount({
      tenantId: tenant.id,
      platform: "tiktok",
      platformUserId: user.open_id,
      accessToken: token.access_token,
      tokenExpiresAt: expiresAt,
    });

    redirect("/settings/connections?connected=tiktok");
  } catch (callbackError) {
    const message =
      callbackError instanceof Error
        ? callbackError.message
        : "TikTok connection failed";
    redirect(`/settings/connections?error=${encodeURIComponent(message)}`);
  }
}
