import { NextResponse } from "next/server";

import { dbConfigured } from "@/lib/env";
import { deleteMediaAsset, getMediaAsset } from "@/lib/media/assets";
import { deleteMediaFile } from "@/lib/media/storage";
import { requireTenant } from "@/lib/api";

export async function POST(request: Request) {
  if (!dbConfigured) {
    return NextResponse.json(
      { error: "Database is not configured." },
      { status: 503 },
    );
  }

  const tenant = await requireTenant();
  if (tenant instanceof Response) return tenant;

  let id: unknown;
  try {
    ({ id } = (await request.json()) as { id?: unknown });
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (typeof id !== "string" || !UUID_RE.test(id)) {
    return NextResponse.json({ error: "Invalid media id." }, { status: 400 });
  }

  const asset = await getMediaAsset(tenant.id, id);

  if (!asset) {
    return NextResponse.json({ error: "Media not found." }, { status: 404 });
  }

  try {
    await deleteMediaFile({
      tenantId: tenant.id,
      url: asset.url,
      filename: asset.filename,
    });
  } catch {
    // Best-effort binary cleanup; still remove the DB record below so the
    // user's view of "my library" stays consistent.
  }

  await deleteMediaAsset(tenant.id, id);

  return NextResponse.json({ ok: true });
}
