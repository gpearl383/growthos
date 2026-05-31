import { createHmac, timingSafeEqual } from "crypto";

import { metaConfigured } from "@/lib/env";
import {
  createSignedOAuthState,
  parseSignedOAuthState,
} from "@/lib/oauth/state";

const META_GRAPH_VERSION = "v21.0";

export const META_OAUTH_SCOPES = [
  "pages_show_list",
  "pages_read_engagement",
  "pages_manage_metadata",
  "instagram_basic",
  "instagram_manage_comments",
  "instagram_manage_messages",
  "instagram_content_publish",
].join(",");

export function metaGraphUrl(path: string) {
  return `https://graph.facebook.com/${META_GRAPH_VERSION}${path}`;
}

export function metaOAuthUrl(input: {
  redirectUri: string;
  state: string;
}) {
  if (!metaConfigured) {
    throw new Error("Meta app is not configured");
  }

  const params = new URLSearchParams({
    client_id: process.env.META_APP_ID!,
    redirect_uri: input.redirectUri,
    scope: META_OAUTH_SCOPES,
    response_type: "code",
    state: input.state,
  });

  return `https://www.facebook.com/${META_GRAPH_VERSION}/dialog/oauth?${params.toString()}`;
}

// Audit finding C3 (2026-05-31): previously fell back to a hardcoded constant
// when META_APP_SECRET was unset, which lets an attacker who knows the
// constant forge `state` and bind a victim's tenant to their Meta account.
// In production we now refuse to sign at all. Local dev keeps the constant
// behind a one-time warning so the OAuth flow still works without secrets.
let warnedAboutSigningFallback = false;
function signingSecret() {
  const real = process.env.META_APP_SECRET;
  if (real) {
    return real;
  }

  const isProd =
    process.env.NODE_ENV === "production" ||
    process.env.VERCEL_ENV === "production";
  if (isProd) {
    throw new Error(
      "META_APP_SECRET is required in production — refusing to sign OAuth state with a fallback.",
    );
  }

  if (!warnedAboutSigningFallback) {
    console.warn(
      "[meta] META_APP_SECRET is unset; using insecure local-dev fallback for OAuth state signing. Set the real secret before deploying.",
    );
    warnedAboutSigningFallback = true;
  }
  return "growthos-dev-meta-secret";
}

export function createOAuthState(tenantId: string) {
  return createSignedOAuthState(tenantId, signingSecret());
}

export function parseOAuthState(state: string) {
  return parseSignedOAuthState(state, signingSecret());
}

/**
 * Verifies the X-Hub-Signature-256 header Meta sends with webhook POSTs.
 * Returns true when the HMAC-SHA256 of the raw body (keyed with META_APP_SECRET)
 * matches the header.
 *
 * Audit finding C4 (2026-05-31): previously returned `true` (fail-open) when
 * `metaConfigured` was false, which silently accepted forged webhook payloads
 * if Meta env vars were partially missing in production. Now we fail closed
 * in production — only fall through in local dev where it's useful for
 * ngrok-relayed test events.
 */
export function verifyMetaSignature(
  rawBody: string,
  signatureHeader: string | null,
): boolean {
  if (!metaConfigured) {
    const isProd =
      process.env.NODE_ENV === "production" ||
      process.env.VERCEL_ENV === "production";
    return !isProd;
  }

  if (!signatureHeader || !signatureHeader.startsWith("sha256=")) {
    return false;
  }

  const provided = signatureHeader.slice("sha256=".length);
  const expected = createHmac("sha256", process.env.META_APP_SECRET!)
    .update(rawBody, "utf8")
    .digest("hex");

  const providedBuf = Buffer.from(provided, "hex");
  const expectedBuf = Buffer.from(expected, "hex");

  if (providedBuf.length !== expectedBuf.length) {
    return false;
  }

  return timingSafeEqual(providedBuf, expectedBuf);
}

export type MetaPageAccount = {
  id: string;
  name: string;
  access_token: string;
  instagram_business_account?: { id: string };
};

export async function exchangeCodeForToken(code: string, redirectUri: string) {
  const params = new URLSearchParams({
    client_id: process.env.META_APP_ID!,
    client_secret: process.env.META_APP_SECRET!,
    redirect_uri: redirectUri,
    code,
  });

  const response = await fetch(metaGraphUrl(`/oauth/access_token?${params}`), {
    signal: AbortSignal.timeout(30_000),
  });
  const data = (await response.json()) as {
    access_token?: string;
    error?: { message: string };
  };

  if (!response.ok || !data.access_token) {
    throw new Error(data.error?.message ?? "Could not exchange OAuth code");
  }

  return data.access_token;
}

export async function exchangeForLongLivedToken(shortLivedToken: string) {
  const params = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: process.env.META_APP_ID!,
    client_secret: process.env.META_APP_SECRET!,
    fb_exchange_token: shortLivedToken,
  });

  const response = await fetch(metaGraphUrl(`/oauth/access_token?${params}`), {
    signal: AbortSignal.timeout(30_000),
  });
  const data = (await response.json()) as {
    access_token?: string;
    expires_in?: number;
    error?: { message: string };
  };

  if (!response.ok || !data.access_token) {
    throw new Error(data.error?.message ?? "Could not get long-lived token");
  }

  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in ?? 60 * 60 * 24 * 60,
  };
}

export async function fetchManagedPages(userAccessToken: string) {
  const params = new URLSearchParams({
    fields: "id,name,access_token,instagram_business_account",
  });

  const response = await fetch(metaGraphUrl(`/me/accounts?${params}`), {
    headers: { Authorization: `Bearer ${userAccessToken}` },
  });
  const data = (await response.json()) as {
    data?: MetaPageAccount[];
    error?: { message: string };
  };

  if (!response.ok) {
    throw new Error(data.error?.message ?? "Could not load Meta pages");
  }

  return data.data ?? [];
}

export async function graphRequest<T>(
  path: string,
  accessToken: string,
  init?: RequestInit,
) {
  const response = await fetch(metaGraphUrl(path), {
    ...init,
    headers: {
      ...init?.headers,
      Authorization: `Bearer ${accessToken}`,
    },
    signal: init?.signal ?? AbortSignal.timeout(30_000),
  });

  const data = (await response.json()) as T & {
    error?: { message: string };
  };

  if (!response.ok || data.error) {
    throw new Error(data.error?.message ?? "Meta Graph API request failed");
  }

  return data;
}
