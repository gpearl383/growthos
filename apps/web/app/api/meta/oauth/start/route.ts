import { redirect } from "next/navigation";
import { NextResponse } from "next/server";

import { appUrl, dbConfigured, metaConfigured } from "@/lib/env";
import { createOAuthState, metaOAuthUrl } from "@/lib/meta/config";
import { getOrCreateTenant } from "@/lib/tenant";

export async function GET() {
  if (!dbConfigured) {
    return NextResponse.json(
      { error: "Database is not configured." },
      { status: 503 },
    );
  }

  if (!metaConfigured) {
    redirect("/settings/connections?error=meta_not_configured");
  }

  const tenant = await getOrCreateTenant();

  if (!tenant.onboardingComplete) {
    redirect("/get-started");
  }

  const redirectUri = `${appUrl()}/api/meta/oauth/callback`;
  const state = createOAuthState(tenant.id);

  redirect(metaOAuthUrl({ redirectUri, state }));
}
