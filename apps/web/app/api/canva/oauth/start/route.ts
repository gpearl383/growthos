import { NextResponse } from "next/server";

import {
  canvaOAuthUrl,
  createPkcePair,
} from "@/lib/canva/config";
import { appUrl, canvaConfigured, dbConfigured } from "@/lib/env";
import { createSignedOAuthState } from "@/lib/oauth/state";
import { getOrCreateTenant } from "@/lib/tenant";

function signingSecret() {
  return process.env.CANVA_CLIENT_SECRET ?? "growthos-dev-canva-secret";
}

export async function GET() {
  if (!dbConfigured) {
    return NextResponse.json(
      { error: "Database is not configured." },
      { status: 503 },
    );
  }

  if (!canvaConfigured) {
    return NextResponse.redirect(
      `${appUrl()}/create?canva=not_configured`,
    );
  }

  const tenant = await getOrCreateTenant();
  if (!tenant.onboardingComplete) {
    return NextResponse.redirect(`${appUrl()}/get-started`);
  }

  const redirectUri = `${appUrl()}/api/canva/oauth/callback`;
  const state = createSignedOAuthState(tenant.id, signingSecret());
  const { verifier, challenge } = createPkcePair();

  const authUrl = canvaOAuthUrl({
    redirectUri,
    state,
    codeChallenge: challenge,
  });

  const response = NextResponse.redirect(authUrl);
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 15,
  };
  response.cookies.set("canva_pkce_verifier", verifier, cookieOptions);
  response.cookies.set("canva_oauth_state", state, cookieOptions);

  return response;
}
