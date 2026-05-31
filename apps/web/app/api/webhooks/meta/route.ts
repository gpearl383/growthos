import { NextResponse } from "next/server";

import { metaWebhookVerifyToken } from "@/lib/env";
import { verifyMetaSignature } from "@/lib/meta/config";
import { processMetaWebhookPayload } from "@/lib/meta/webhooks";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const WEBHOOK_RATE_LIMIT = { max: 100, windowMs: 60_000 };

export async function GET(request: Request) {
  const limit = await checkRateLimit(`meta-webhook:${getClientIp(request)}`, WEBHOOK_RATE_LIMIT);
  if (!limit.ok) {
    return NextResponse.json({ error: "Too many requests" }, {
      status: 429,
      headers: { "Retry-After": String(Math.ceil(limit.retryAfterMs / 1000)) },
    });
  }

  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === metaWebhookVerifyToken() && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Verification failed" }, { status: 403 });
}

export async function POST(request: Request) {
  const limit = await checkRateLimit(`meta-webhook:${getClientIp(request)}`, WEBHOOK_RATE_LIMIT);
  if (!limit.ok) {
    return NextResponse.json({ error: "Too many requests" }, {
      status: 429,
      headers: { "Retry-After": String(Math.ceil(limit.retryAfterMs / 1000)) },
    });
  }

  const rawBody = await request.text();

  if (!verifyMetaSignature(rawBody, request.headers.get("x-hub-signature-256"))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: unknown;

  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const result = await processMetaWebhookPayload(payload);
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Webhook processing failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
