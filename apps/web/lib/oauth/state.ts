import { createHmac, timingSafeEqual } from "crypto";

export function createSignedOAuthState(
  tenantId: string,
  signingSecret: string,
) {
  const payload = JSON.stringify({
    tenantId,
    ts: Date.now(),
    nonce: Math.random().toString(36).slice(2, 10),
  });
  const signature = createHmac("sha256", signingSecret)
    .update(payload)
    .digest("hex");

  return Buffer.from(JSON.stringify({ payload, signature })).toString(
    "base64url",
  );
}

export function parseSignedOAuthState(state: string, signingSecret: string) {
  let parsed: { payload: string; signature: string };
  try {
    parsed = JSON.parse(Buffer.from(state, "base64url").toString("utf8")) as {
      payload: string;
      signature: string;
    };
  } catch {
    return null;
  }

  const expected = createHmac("sha256", signingSecret)
    .update(parsed.payload)
    .digest("hex");

  const valid = timingSafeEqual(
    Buffer.from(expected, "hex"),
    Buffer.from(parsed.signature, "hex"),
  );

  if (!valid) {
    return null;
  }

  const data = JSON.parse(parsed.payload) as {
    tenantId: string;
    ts: number;
  };

  if (Date.now() - data.ts > 1000 * 60 * 15) {
    return null;
  }

  return data;
}
