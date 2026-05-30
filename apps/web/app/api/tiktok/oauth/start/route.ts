import { redirect } from "next/navigation";
import { NextResponse } from "next/server";

import { appUrl, dbConfigured, tiktokConfigured } from "@/lib/env";
import { createTikTokOAuthState, tiktokOAuthUrl } from "@/lib/tiktok/config";
import { getOrCreateTenant } from "@/lib/tenant";

export async function GET() {
  if (!dbConfigured) {
    return NextResponse.json(
      { error: "Database is not configured." },
      { status: 503 },
    );
  }

  if (!tiktokConfigured) {
    redirect("/settings/connections?error=tiktok_not_configured");
  }

  const tenant = await getOrCreateTenant();

  if (!tenant.onboardingComplete) {
    redirect("/get-started");
  }

  const redirectUri = `${appUrl()}/api/tiktok/oauth/callback`;
  const state = createTikTokOAuthState(tenant.id);

  redirect(tiktokOAuthUrl({ redirectUri, state }));
}
