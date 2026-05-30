import { NextResponse } from "next/server";

import { dbConfigured, openaiConfigured } from "@/lib/env";
import { createMediaAsset } from "@/lib/media/assets";
import { saveMediaBuffer } from "@/lib/media/storage";
import { generateImage } from "@/lib/openai/images";
import { getOrCreateTenant } from "@/lib/tenant";

export const maxDuration = 60;

export async function POST(request: Request) {
  if (!dbConfigured) {
    return NextResponse.json(
      { error: "Database is not configured." },
      { status: 503 },
    );
  }

  if (!openaiConfigured) {
    return NextResponse.json(
      { error: "Add OPENAI_API_KEY to generate images." },
      { status: 503 },
    );
  }

  const tenant = await getOrCreateTenant();
  if (!tenant.onboardingComplete) {
    return NextResponse.json(
      { error: "Complete onboarding first." },
      { status: 403 },
    );
  }

  const body = (await request.json()) as { prompt?: string };
  const prompt = body.prompt?.trim();

  if (!prompt) {
    return NextResponse.json(
      { error: "Describe the image you want to generate." },
      { status: 400 },
    );
  }

  try {
    const { buffer, mimeType } = await generateImage(prompt);
    const stored = await saveMediaBuffer({
      tenantId: tenant.id,
      buffer,
      mimeType,
    });

    const asset = await createMediaAsset({
      tenantId: tenant.id,
      url: stored.url,
      type: stored.type,
      filename: stored.filename,
      mimeType: stored.mimeType,
      altText: prompt.slice(0, 120),
      source: "ai-image",
    });

    return NextResponse.json({ asset });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Image generation failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
