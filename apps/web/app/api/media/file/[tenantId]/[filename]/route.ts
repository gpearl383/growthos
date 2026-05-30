import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { extname } from "node:path";

import { getMediaFilePath } from "@/lib/media/storage";

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

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ tenantId: string; filename: string }> },
) {
  const { tenantId, filename } = await params;
  const filePath = getMediaFilePath(tenantId, filename);

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
