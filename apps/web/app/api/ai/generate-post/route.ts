import { NextResponse } from "next/server";
import { z } from "zod";

import { generatePostContent } from "@/lib/ai/generate-post";
import { dbConfigured } from "@/lib/env";
import { resolveApiKey } from "@/lib/secrets";
import { getOrCreateTenant } from "@/lib/tenant";

const requestSchema = z.object({
  platform: z.enum(["instagram", "facebook"]),
  photoDescription: z.string().trim().optional(),
});

export async function POST(request: Request) {
  if (!dbConfigured) {
    return NextResponse.json(
      { error: "Database is not configured." },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const tenant = await getOrCreateTenant();

  if (!tenant.onboardingComplete) {
    return NextResponse.json(
      { error: "Complete onboarding first." },
      { status: 403 },
    );
  }

  try {
    const generated = await generatePostContent({
      businessType: tenant.businessType,
      businessName: tenant.businessName,
      offerText: tenant.offerText,
      goal: tenant.goal,
      platform: parsed.data.platform,
      photoDescription: parsed.data.photoDescription,
      apiKey: await resolveApiKey(tenant.id, "anthropic"),
    });

    return NextResponse.json({ ok: true, post: generated });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not generate post.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
