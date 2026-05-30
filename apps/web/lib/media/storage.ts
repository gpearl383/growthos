import { existsSync, mkdirSync } from "node:fs";
import { unlink, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { dirname, extname, join } from "node:path";

import { getLocalDatabasePath } from "@growthos/db";

import { appUrl } from "@/lib/env";
import type { MediaType } from "@/lib/media/types";

const MIME_TO_TYPE: Array<{ prefix: string; type: MediaType }> = [
  { prefix: "image/", type: "image" },
  { prefix: "video/", type: "video" },
  { prefix: "audio/", type: "audio" },
];

const EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "video/mp4": ".mp4",
  "video/quicktime": ".mov",
  "video/webm": ".webm",
  "audio/mpeg": ".mp3",
  "audio/mp3": ".mp3",
  "audio/wav": ".wav",
  "audio/webm": ".weba",
};

export function mediaTypeFromMime(mimeType: string): MediaType | null {
  const match = MIME_TO_TYPE.find((entry) => mimeType.startsWith(entry.prefix));
  return match?.type ?? null;
}

export function getUploadsRoot() {
  // `.data/growthos` is the DB path; uploads live alongside it at `.data/uploads`.
  return join(dirname(getLocalDatabasePath()), "uploads");
}

export function getTenantUploadsDir(tenantId: string) {
  return join(getUploadsRoot(), tenantId);
}

export function getMediaFilePath(tenantId: string, filename: string) {
  // Strip any path separators to prevent traversal outside the tenant folder.
  const safeName = filename.replace(/[/\\]/g, "");
  return join(getTenantUploadsDir(tenantId), safeName);
}

export function mediaFileUrl(tenantId: string, filename: string) {
  return `${appUrl()}/api/media/file/${tenantId}/${filename}`;
}

export function filenameFromMediaUrl(url: string): string | null {
  const match = url.match(/\/api\/media\/file\/[^/]+\/([^/?#]+)/);
  return match ? match[1] : null;
}

export async function deleteMediaFile(tenantId: string, filename: string) {
  const filePath = getMediaFilePath(tenantId, filename);
  if (existsSync(filePath)) {
    await unlink(filePath);
  }
}

export type StoredMedia = {
  url: string;
  filename: string;
  mimeType: string;
  type: MediaType;
};

export async function saveMediaBuffer(input: {
  tenantId: string;
  buffer: Buffer;
  mimeType: string;
  originalName?: string;
}): Promise<StoredMedia> {
  const { tenantId, buffer, mimeType } = input;
  const type = mediaTypeFromMime(mimeType);

  if (!type) {
    throw new Error(
      "Unsupported file type. Upload an image, video, or audio file.",
    );
  }

  const dir = getTenantUploadsDir(tenantId);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  const extension =
    EXTENSION_BY_MIME[mimeType] ||
    (input.originalName ? extname(input.originalName) : "") ||
    "";
  const filename = `${randomUUID()}${extension}`;

  await writeFile(getMediaFilePath(tenantId, filename), buffer);

  return {
    url: mediaFileUrl(tenantId, filename),
    filename,
    mimeType,
    type,
  };
}

export async function saveUploadedFile(input: {
  tenantId: string;
  file: File;
}): Promise<StoredMedia> {
  const { tenantId, file } = input;
  const buffer = Buffer.from(await file.arrayBuffer());

  return saveMediaBuffer({
    tenantId,
    buffer,
    mimeType: file.type || "application/octet-stream",
    originalName: file.name,
  });
}
