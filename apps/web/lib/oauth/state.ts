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
  try {
    const parsed = JSON.parse(
      Buffer.from(state, "base64url").toString("utf8"),
    ) as { payload?: unknown; signature?: unknown };

    if (
      typeof parsed.payload !== "string" ||
      typeof parsed.signature !== "string"
    ) {
      return null;
    }

    const expected = createHmac("sha256", signingSecret)
      .update(parsed.payload)
      .digest("hex");

    const expectedBuf = Buffer.from(expected, "hex");
    const providedBuf = Buffer.from(parsed.signature, "hex");

    if (
      expectedBuf.length !== providedBuf.length ||
      !timingSafeEqual(expectedBuf, providedBuf)
    ) {
      return null;
    }

    const data = JSON.parse(parsed.payload) as {
      tenantId?: unknown;
      ts?: unknown;
    };

    if (typeof data.tenantId !== "string" || typeof data.ts !== "number") {
      return null;
    }

    if (Date.now() - data.ts > 1000 * 60 * 15) {
      return null;
    }

    return { tenantId: data.tenantId, ts: data.ts };
  } catch {
    return null;
  }
}
