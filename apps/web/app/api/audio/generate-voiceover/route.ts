import { NextResponse } from "next/server";

import { dbConfigured, elevenlabsConfigured } from "@/lib/env";
import { generateVoiceover } from "@/lib/elevenlabs/voiceover";
import { createMediaAsset } from "@/lib/media/assets";
import { saveMediaBuffer } from "@/lib/media/storage";
import { getOrCreateTenant } from "@/lib/tenant";

export const maxDuration = 60;

export async function POST(request: Request) {
  if (!dbConfigured) {
    return NextResponse.json(
      { error: "Database is not configured." },
      { status: 503 },
    );
  }

  if (!elevenlabsConfigured) {
    return NextResponse.json(
      { error: "Add ELEVENLABS_API_KEY to generate voiceovers." },
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

  const body = (await request.json()) as { text?: string };
  const text = body.text?.trim();

  if (!text) {
    return NextResponse.json(
      { error: "Add caption text to turn into a voiceover." },
      { status: 400 },
    );
  }

  try {
    const { buffer, mimeType } = await generateVoiceover(text.slice(0, 2500));
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
      source: "voiceover",
    });

    return NextResponse.json({ asset });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Voiceover generation failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
