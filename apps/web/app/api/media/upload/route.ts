import { NextResponse } from "next/server";

import { dbConfigured } from "@/lib/env";
import { createMediaAsset } from "@/lib/media/assets";
import { saveUploadedFile } from "@/lib/media/storage";
import { getOrCreateTenant } from "@/lib/tenant";

export const maxDuration = 30;

export async function POST(request: Request) {
  if (!dbConfigured) {
    return NextResponse.json(
      { error: "Database is not configured." },
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

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }

  try {
    const stored = await saveUploadedFile({ tenantId: tenant.id, file });
    const altText =
      typeof formData.get("altText") === "string"
        ? (formData.get("altText") as string)
        : undefined;

    const asset = await createMediaAsset({
      tenantId: tenant.id,
      url: stored.url,
      type: stored.type,
      filename: stored.filename,
      mimeType: stored.mimeType,
      altText,
    });

    return NextResponse.json({ asset });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Upload failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
