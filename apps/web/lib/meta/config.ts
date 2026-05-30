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

function signingSecret() {
  return process.env.META_APP_SECRET ?? "growthos-dev-meta-secret";
}

export function createOAuthState(tenantId: string) {
  return createSignedOAuthState(tenantId, signingSecret());
}

export function parseOAuthState(state: string) {
  return parseSignedOAuthState(state, signingSecret());
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

  const response = await fetch(metaGraphUrl(`/oauth/access_token?${params}`));
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

  const response = await fetch(metaGraphUrl(`/oauth/access_token?${params}`));
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
    access_token: userAccessToken,
    fields: "id,name,access_token,instagram_business_account",
  });

  const response = await fetch(metaGraphUrl(`/me/accounts?${params}`));
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
  const separator = path.includes("?") ? "&" : "?";
  const response = await fetch(
    metaGraphUrl(`${path}${separator}access_token=${accessToken}`),
    init,
  );

  const data = (await response.json()) as T & {
    error?: { message: string };
  };

  if (!response.ok || data.error) {
    throw new Error(data.error?.message ?? "Meta Graph API request failed");
  }

  return data;
}
