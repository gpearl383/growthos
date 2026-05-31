import { redirect } from "next/navigation";

import { appUrl, dbConfigured, metaConfigured } from "@/lib/env";
import {
  exchangeCodeForToken,
  exchangeForLongLivedToken,
  fetchManagedPages,
  parseOAuthState,
} from "@/lib/meta/config";
import { upsertSocialAccount } from "@/lib/social-accounts";
import { getOrCreateTenant } from "@/lib/tenant";

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

  // Verify the active Clerk session belongs to the tenant in the state.
  // Without this check a stolen/replayed callback URL could bind a victim's
  // social account to a different tenant's session.
  let tenant;
  try {
    tenant = await getOrCreateTenant();
  } catch {
    redirect("/settings/connections?error=not_signed_in");
  }

  if (tenant.id !== parsedState.tenantId) {
    redirect("/settings/connections?error=session_mismatch");
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
