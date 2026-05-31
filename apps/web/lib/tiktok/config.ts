import { tiktokConfigured } from "@/lib/env";
import {
  createSignedOAuthState,
  parseSignedOAuthState,
} from "@/lib/oauth/state";

export const TIKTOK_OAUTH_SCOPES = [
  "user.info.basic",
  "video.publish",
].join(",");

// Audit finding C3 (2026-05-31) — see lib/meta/config.ts for full context.
// Refuse to sign OAuth state with a hardcoded fallback in production.
let warnedAboutSigningFallback = false;
function signingSecret() {
  const real = process.env.TIKTOK_CLIENT_SECRET;
  if (real) {
    return real;
  }

  const isProd =
    process.env.NODE_ENV === "production" ||
    process.env.VERCEL_ENV === "production";
  if (isProd) {
    throw new Error(
      "TIKTOK_CLIENT_SECRET is required in production — refusing to sign OAuth state with a fallback.",
    );
  }

  if (!warnedAboutSigningFallback) {
    console.warn(
      "[tiktok] TIKTOK_CLIENT_SECRET is unset; using insecure local-dev fallback for OAuth state signing. Set the real secret before deploying.",
    );
    warnedAboutSigningFallback = true;
  }
  return "growthos-dev-tiktok-secret";
}

export function tiktokOAuthUrl(input: {
  redirectUri: string;
  state: string;
}) {
  if (!tiktokConfigured) {
    throw new Error("TikTok app is not configured");
  }

  const params = new URLSearchParams({
    client_key: process.env.TIKTOK_CLIENT_KEY!,
    scope: TIKTOK_OAUTH_SCOPES,
    response_type: "code",
    redirect_uri: input.redirectUri,
    state: input.state,
  });

  return `https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`;
}

export function createTikTokOAuthState(tenantId: string) {
  return createSignedOAuthState(tenantId, signingSecret());
}

export function parseTikTokOAuthState(state: string) {
  return parseSignedOAuthState(state, signingSecret());
}

export type TikTokTokenResponse = {
  access_token: string;
  expires_in: number;
  open_id: string;
  refresh_token?: string;
  refresh_expires_in?: number;
  scope?: string;
  token_type?: string;
};

export async function exchangeTikTokCodeForToken(
  code: string,
  redirectUri: string,
) {
  const response = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_key: process.env.TIKTOK_CLIENT_KEY!,
      client_secret: process.env.TIKTOK_CLIENT_SECRET!,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    }),
    signal: AbortSignal.timeout(30_000),
  });

  const data = (await response.json()) as {
    data?: TikTokTokenResponse;
    error?: { message?: string; code?: string };
  };

  if (!response.ok || !data.data?.access_token) {
    throw new Error(
      data.error?.message ?? "Could not exchange TikTok OAuth code",
    );
  }

  return data.data;
}

export type TikTokUserInfo = {
  open_id: string;
  display_name?: string;
  avatar_url?: string;
};

export async function fetchTikTokUser(accessToken: string) {
  const response = await fetch(
    "https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,avatar_url",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      signal: AbortSignal.timeout(30_000),
    },
  );

  const data = (await response.json()) as {
    data?: { user?: TikTokUserInfo };
    error?: { message?: string; code?: string };
  };

  if (!response.ok || !data.data?.user?.open_id) {
    throw new Error(data.error?.message ?? "Could not load TikTok profile");
  }

  return data.data.user;
}

export async function tiktokApiRequest<T>(
  path: string,
  accessToken: string,
  init?: RequestInit,
) {
  const response = await fetch(`https://open.tiktokapis.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json; charset=UTF-8",
      ...init?.headers,
    },
    signal: init?.signal ?? AbortSignal.timeout(30_000),
  });

  const data = (await response.json()) as T & {
    error?: { message?: string; code?: string };
  };

  if (!response.ok || data.error) {
    throw new Error(data.error?.message ?? "TikTok API request failed");
  }

  return data;
}
