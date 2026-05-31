import { NextResponse } from "next/server";

import { dbConfigured } from "@/lib/env";
import { createMediaAsset } from "@/lib/media/assets";
import { saveUploadedFile } from "@/lib/media/storage";
import { requireTenant } from "@/lib/api";

export const maxDuration = 30;

const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/quicktime",
  "audio/mpeg",
  "audio/mp4",
  "audio/wav",
];

export async function POST(request: Request) {
  if (!dbConfigured) {
    return NextResponse.json(
      { error: "Database is not configured." },
      { status: 503 },
    );
  }

  const tenant = await requireTenant();
  if (tenant instanceof Response) return tenant;

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

  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: "File is too large. The maximum upload size is 50 MB." },
      { status: 413 },
    );
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Unsupported file type." },
      { status: 415 },
    );
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
