import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { exchangeCanvaCode } from "@/lib/canva/config";
import { appUrl, canvaConfigured, dbConfigured } from "@/lib/env";
import { parseSignedOAuthState } from "@/lib/oauth/state";

function signingSecret() {
  return process.env.CANVA_CLIENT_SECRET ?? "growthos-dev-canva-secret";
}

function createUrl(path: string) {
  return `${appUrl()}${path}`;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      createUrl(`/create?canva=${encodeURIComponent(error)}`),
    );
  }

  if (!dbConfigured || !canvaConfigured || !code || !state) {
    return NextResponse.redirect(createUrl("/create?canva=invalid_callback"));
  }

  const cookieStore = await cookies();
  const cookieState = cookieStore.get("canva_oauth_state")?.value;
  const verifier = cookieStore.get("canva_pkce_verifier")?.value;

  if (!cookieState || cookieState !== state || !verifier) {
    return NextResponse.redirect(createUrl("/create?canva=invalid_state"));
  }

  const parsedState = parseSignedOAuthState(state, signingSecret());
  if (!parsedState) {
    return NextResponse.redirect(createUrl("/create?canva=invalid_state"));
  }

  try {
    const redirectUri = createUrl("/api/canva/oauth/callback");
    const token = await exchangeCanvaCode({
      code,
      redirectUri,
      codeVerifier: verifier,
    });

    const response = NextResponse.redirect(createUrl("/create?canva=connected"));
    // Key by tenantId so switching orgs in the same browser doesn't bleed tokens.
    response.cookies.set(`canva_access_token_${parsedState.tenantId}`, token.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: token.expires_in,
    });
    response.cookies.delete("canva_pkce_verifier");
    response.cookies.delete("canva_oauth_state");

    return response;
  } catch (callbackError) {
    const message =
      callbackError instanceof Error
        ? callbackError.message
        : "Canva connection failed";
    return NextResponse.redirect(
      createUrl(`/create?canva=${encodeURIComponent(message)}`),
    );
  }
}
