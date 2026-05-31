import { NextResponse } from "next/server";
import { z } from "zod";

import { createLeadFromForm } from "@/lib/leads";
import { dbConfigured } from "@/lib/env";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const LEAD_RATE_LIMIT = { max: 10, windowMs: 60_000 };

const leadSubmissionSchema = z.object({
  tenantSlug: z.string().trim().min(1),
  pageSlug: z.string().trim().min(1),
  name: z.string().trim().min(1, "Name is required"),
  email: z
    .string()
    .trim()
    .email()
    .optional()
    .or(z.literal(""))
    .transform((v) => v || undefined),
  phone: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? value : undefined)),
});

async function parseBody(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return (await request.json()) as Record<string, string>;
  }

  const form = await request.formData();
  return Object.fromEntries(form.entries()) as Record<string, string>;
}

function isJsonRequest(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  return contentType.includes("application/json");
}

export async function POST(request: Request) {
  if (!dbConfigured) {
    return NextResponse.json(
      { error: "Lead capture is not configured yet." },
      { status: 503 },
    );
  }

  const ip = getClientIp(request);
  const limit = await checkRateLimit(`leads:${ip}`, LEAD_RATE_LIMIT);

  if (!limit.ok) {
    const retryAfterSec = Math.max(1, Math.ceil(limit.retryAfterMs / 1000));

    if (isJsonRequest(request)) {
      return NextResponse.json(
        { error: "Too many submissions. Please try again in a moment." },
        { status: 429, headers: { "Retry-After": String(retryAfterSec) } },
      );
    }

    const redirectUrl = new URL(request.url);
    const tenantSlugRaw = new URL(request.url).searchParams.get("tenantSlug");
    const pageSlugRaw = new URL(request.url).searchParams.get("pageSlug");
    redirectUrl.pathname = `/p/${tenantSlugRaw ?? ""}/${pageSlugRaw ?? ""}`;
    redirectUrl.searchParams.set("error", "rate_limit");
    return NextResponse.redirect(redirectUrl, { status: 303 });
  }

  const body = await parseBody(request);
  const parsed = leadSubmissionSchema.safeParse(body);

  if (!parsed.success) {
    const message = parsed.error.flatten().fieldErrors.name?.[0] ?? "Invalid submission.";

    if (isJsonRequest(request)) {
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const redirectUrl = new URL(request.url);
    redirectUrl.pathname = `/p/${body.tenantSlug ?? ""}/${body.pageSlug ?? ""}`;
    redirectUrl.searchParams.set("error", "1");
    return NextResponse.redirect(redirectUrl);
  }

  const result = await createLeadFromForm(parsed.data);

  if ("error" in result) {
    if (isJsonRequest(request)) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }

    const redirectUrl = new URL(request.url);
    redirectUrl.pathname = `/p/${parsed.data.tenantSlug}/${parsed.data.pageSlug}`;
    redirectUrl.searchParams.set("error", "1");
    return NextResponse.redirect(redirectUrl);
  }

  if (isJsonRequest(request)) {
    return NextResponse.json({
      ok: true,
      leadId: result.lead.id,
    });
  }

  const redirectUrl = new URL(request.url);
  redirectUrl.pathname = `/p/${parsed.data.tenantSlug}/${parsed.data.pageSlug}`;
  redirectUrl.searchParams.set("thanks", "1");
  return NextResponse.redirect(redirectUrl);
}
