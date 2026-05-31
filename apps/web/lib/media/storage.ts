import { existsSync, mkdirSync } from "node:fs";
import { unlink, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { dirname, extname, join, resolve, sep } from "node:path";

import { del as blobDel, put as blobPut } from "@vercel/blob";

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

// True when Vercel Blob is the active storage backend.
// Vercel sets BLOB_READ_WRITE_TOKEN when a Blob store is linked to the project;
// the @vercel/blob SDK reads it from the environment automatically.
function usingBlob() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

// --- Filesystem-mode helpers (local dev only) ------------------------------

export function getUploadsRoot() {
  // `.data/growthos` is the DB path; uploads live alongside it at `.data/uploads`.
  return join(dirname(getLocalDatabasePath()), "uploads");
}

export function getTenantUploadsDir(tenantId: string) {
  return join(getUploadsRoot(), tenantId);
}

// Throws on any filename that would escape the tenant directory: empty
// strings, NUL bytes, path separators, `.` / `..` relative components, or
// anything that — after resolution — ends up outside the tenant root. Audit
// finding C1 (2026-05-31) was that the previous regex strip didn't catch
// `..`, so a crafted filename could be joined into the parent uploads dir.
export function getMediaFilePath(tenantId: string, filename: string) {
  if (
    !filename ||
    filename === "." ||
    filename === ".." ||
    filename.includes("/") ||
    filename.includes("\\") ||
    filename.includes("\0")
  ) {
    throw new Error("Invalid filename.");
  }

  const tenantRoot = resolve(getTenantUploadsDir(tenantId));
  const candidate = resolve(tenantRoot, filename);

  // Defense-in-depth — even though we rejected separators above, double-check
  // the resolved path is strictly under the tenant root.
  if (
    candidate !== tenantRoot &&
    !candidate.startsWith(tenantRoot + sep)
  ) {
    throw new Error("Invalid filename.");
  }

  return candidate;
}

export function mediaFileUrl(tenantId: string, filename: string) {
  return `${appUrl()}/api/media/file/${tenantId}/${filename}`;
}

// Extracts the filename from a local /api/media/file/... URL. Returns null for
// Blob URLs — those go through `del()` by URL, not by filename.
export function filenameFromMediaUrl(url: string): string | null {
  const match = url.match(/\/api\/media\/file\/[^/]+\/([^/?#]+)/);
  return match ? match[1] : null;
}

// --- Public API ------------------------------------------------------------

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

  const extension =
    EXTENSION_BY_MIME[mimeType] ||
    (input.originalName ? extname(input.originalName) : "") ||
    "";
  const filename = `${randomUUID()}${extension}`;

  if (usingBlob()) {
    // Pathname inside the Blob store. Keeping it tenant-scoped so we can
    // bulk-list / bulk-delete by prefix if we ever need to. The Blob URL
    // itself is opaque and globally unique; the pathname is just metadata.
    const pathname = `tenants/${tenantId}/${filename}`;
    const result = await blobPut(pathname, buffer, {
      access: "public",
      contentType: mimeType,
      // No need for random suffix — our randomUUID() already guarantees
      // uniqueness, and a deterministic pathname makes manual cleanup easier.
      addRandomSuffix: false,
    });

    return {
      url: result.url,
      filename: pathname,
      mimeType,
      type,
    };
  }

  // Filesystem fallback for local dev.
  const dir = getTenantUploadsDir(tenantId);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

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

// Deletes the underlying media binary. Best-effort — caller decides whether
// to surface failures (current callers swallow them, since the DB row is the
// source of truth for "exists").
//
// For Blob-backed assets, pass the asset URL — `@vercel/blob/del` works by
// URL, not by pathname. For filesystem-backed assets, the filename (column
// `media_assets.filename`) is preferred; the URL is parsed as a fallback.
export async function deleteMediaFile(input: {
  tenantId: string;
  url: string;
  filename?: string | null;
}) {
  const { tenantId, url, filename } = input;

  // Blob URLs always live on *.public.blob.vercel-storage.com — easiest
  // signal that this asset is in the cloud regardless of whether we happen
  // to have the token set right now.
  const isBlobUrl = /\.public\.blob\.vercel-storage\.com\//.test(url);
  if (isBlobUrl) {
    await blobDel(url);
    return;
  }

  const localName = filename ?? filenameFromMediaUrl(url);
  if (!localName) {
    return;
  }

  const filePath = getMediaFilePath(tenantId, localName);
  if (existsSync(filePath)) {
    await unlink(filePath);
  }
}
