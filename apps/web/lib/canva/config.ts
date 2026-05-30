import { createHash, randomBytes } from "crypto";

import { canvaConfigured } from "@/lib/env";

export const CANVA_OAUTH_SCOPES = [
  "design:content:read",
  "design:content:write",
  "asset:read",
  "asset:write",
].join(" ");

const CANVA_AUTH_BASE = "https://www.canva.com/api/oauth/authorize";
const CANVA_TOKEN_URL = "https://api.canva.com/rest/v1/oauth/token";
const CANVA_API_BASE = "https://api.canva.com/rest/v1";

export function createPkcePair() {
  const verifier = randomBytes(48).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

export function canvaOAuthUrl(input: {
  redirectUri: string;
  state: string;
  codeChallenge: string;
}) {
  if (!canvaConfigured) {
    throw new Error("Canva app is not configured");
  }

  const params = new URLSearchParams({
    client_id: process.env.CANVA_CLIENT_ID!,
    response_type: "code",
    redirect_uri: input.redirectUri,
    scope: CANVA_OAUTH_SCOPES,
    state: input.state,
    code_challenge: input.codeChallenge,
    code_challenge_method: "S256",
  });

  return `${CANVA_AUTH_BASE}?${params.toString()}`;
}

export type CanvaTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
};

function basicAuthHeader() {
  const credentials = `${process.env.CANVA_CLIENT_ID}:${process.env.CANVA_CLIENT_SECRET}`;
  return `Basic ${Buffer.from(credentials).toString("base64")}`;
}

export async function exchangeCanvaCode(input: {
  code: string;
  redirectUri: string;
  codeVerifier: string;
}) {
  const response = await fetch(CANVA_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: basicAuthHeader(),
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code: input.code,
      redirect_uri: input.redirectUri,
      code_verifier: input.codeVerifier,
    }),
  });

  const data = (await response.json()) as CanvaTokenResponse & {
    error?: string;
    error_description?: string;
  };

  if (!response.ok || !data.access_token) {
    throw new Error(
      data.error_description ?? data.error ?? "Could not exchange Canva code",
    );
  }

  return data;
}

export type CanvaDesign = {
  id: string;
  urls?: { edit_url?: string; view_url?: string };
};

export async function createCanvaDesign(input: {
  accessToken: string;
  title: string;
  width: number;
  height: number;
}) {
  const response = await fetch(`${CANVA_API_BASE}/designs`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      design_type: {
        type: "custom",
        width: input.width,
        height: input.height,
      },
      title: input.title,
    }),
  });

  const data = (await response.json()) as {
    design?: CanvaDesign;
    message?: string;
  };

  if (!response.ok || !data.design) {
    throw new Error(data.message ?? "Could not create Canva design");
  }

  return data.design;
}

export const PLATFORM_CANVAS_SIZE: Record<
  "instagram" | "facebook" | "tiktok",
  { width: number; height: number }
> = {
  instagram: { width: 1080, height: 1080 },
  facebook: { width: 1080, height: 1350 },
  tiktok: { width: 1080, height: 1920 },
};
