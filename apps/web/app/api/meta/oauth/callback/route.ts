import { eq } from "@growthos/db";
import { tenants } from "@growthos/db";
import { redirect } from "next/navigation";

import { getDb } from "@/lib/db";
import { appUrl, dbConfigured, metaConfigured } from "@/lib/env";
import {
  exchangeCodeForToken,
  exchangeForLongLivedToken,
  fetchManagedPages,
  parseOAuthState,
} from "@/lib/meta/config";
import { upsertSocialAccount } from "@/lib/social-accounts";

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

  if (!dbConfigured || !metaConfigured || !code || !state) {
    redirect("/settings/connections?error=invalid_callback");
  }

  const parsedState = parseOAuthState(state);
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
    const redirectUri = `${appUrl()}/api/meta/oauth/callback`;
    const shortToken = await exchangeCodeForToken(code, redirectUri);
    const longToken = await exchangeForLongLivedToken(shortToken);
    const pages = await fetchManagedPages(longToken.accessToken);
    const expiresAt = new Date(Date.now() + longToken.expiresIn * 1000);

    let connected = false;

    for (const page of pages) {
      if (page.instagram_business_account?.id) {
        await upsertSocialAccount({
          tenantId: tenant.id,
          platform: "instagram",
          platformUserId: page.instagram_business_account.id,
          accessToken: page.access_token,
          tokenExpiresAt: expiresAt,
        });
        connected = true;
      }

      await upsertSocialAccount({
        tenantId: tenant.id,
        platform: "facebook",
        platformUserId: page.id,
        accessToken: page.access_token,
        tokenExpiresAt: expiresAt,
      });
      connected = true;
    }

    if (!connected) {
      redirect("/settings/connections?error=no_pages_found");
    }

    redirect("/settings/connections?connected=1");
  } catch (callbackError) {
    const message =
      callbackError instanceof Error
        ? callbackError.message
        : "Meta connection failed";
    redirect(`/settings/connections?error=${encodeURIComponent(message)}`);
  }
}
