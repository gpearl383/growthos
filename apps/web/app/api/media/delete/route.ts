import { NextResponse } from "next/server";

import { dbConfigured } from "@/lib/env";
import { deleteMediaAsset, getMediaAsset } from "@/lib/media/assets";
import { deleteMediaFile, filenameFromMediaUrl } from "@/lib/media/storage";
import { getOrCreateTenant } from "@/lib/tenant";

export async function POST(request: Request) {
  if (!dbConfigured) {
    return NextResponse.json(
      { error: "Database is not configured." },
      { status: 503 },
    );
  }

  const tenant = await getOrCreateTenant();

  let id: unknown;
  try {
    ({ id } = (await request.json()) as { id?: unknown });
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (typeof id !== "string" || id.length === 0) {
    return NextResponse.json({ error: "Missing media id." }, { status: 400 });
  }

  const asset = await getMediaAsset(tenant.id, id);

  if (!asset) {
    return NextResponse.json({ error: "Media not found." }, { status: 404 });
  }

  const filename = asset.filename ?? filenameFromMediaUrl(asset.url);
  if (filename) {
    try {
      await deleteMediaFile(tenant.id, filename);
    } catch {
      // Best-effort file cleanup; still remove the DB record below.
    }
  }

  await deleteMediaAsset(tenant.id, id);

  return NextResponse.json({ ok: true });
}
