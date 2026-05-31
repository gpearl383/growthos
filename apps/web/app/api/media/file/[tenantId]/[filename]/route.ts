import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { extname } from "node:path";

import { getMediaFilePath } from "@/lib/media/storage";
import { getOrCreateTenant } from "@/lib/tenant";

const CONTENT_TYPE_BY_EXT: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
  ".webm": "video/webm",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".weba": "audio/webm",
};

// Audit finding C2 (2026-05-31): this route used to serve any file under any
// tenant directory by URL params alone — an IDOR allowing any signed-in user
// who could guess another tenant's UUID + filename to read their media. Now
// gated by the authenticated tenant.
//
// Note: in Vercel production we use Vercel Blob (public URLs served direct
// from blob.vercel-storage.com), so this route only fires in local dev when
// `BLOB_READ_WRITE_TOKEN` is unset and storage falls back to the filesystem.
// Keeping the route gated even in dev so the local + prod auth posture
// matches and we don't reintroduce the IDOR if someone wires the route back
// up for any reason.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ tenantId: string; filename: string }> },
) {
  const { tenantId, filename } = await params;

  let tenant;
  try {
    tenant = await getOrCreateTenant();
  } catch {
    return new Response("Unauthorized", { status: 401 });
  }

  if (tenant.id !== tenantId) {
    return new Response("Forbidden", { status: 403 });
  }

  let filePath: string;
  try {
    filePath = getMediaFilePath(tenantId, filename);
  } catch {
    return new Response("Invalid filename", { status: 400 });
  }

  if (!existsSync(filePath)) {
    return new Response("Not found", { status: 404 });
  }

  const file = await readFile(filePath);
  const contentType =
    CONTENT_TYPE_BY_EXT[extname(filename).toLowerCase()] ||
    "application/octet-stream";

  return new Response(new Uint8Array(file), {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
