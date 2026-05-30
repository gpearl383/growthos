import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

const DEV_FALLBACK_KEY = "growthos-dev-insecure-key";

let warnedAboutDevKey = false;

/**
 * Resolves the AES-256 key used to encrypt every secret stored in the DB
 * (OAuth tokens, tenant-managed API keys, etc.).
 *
 * Production: TOKEN_ENCRYPTION_KEY is REQUIRED. We refuse to fall back to a
 * dev default in production because that would silently leak ciphertext that
 * anyone with the source code could decrypt.
 *
 * Development: a missing key is allowed but logged once, so local devs aren't
 * blocked while learning the app, and encrypted rows survive restarts.
 */
function getEncryptionKey() {
  const explicit = process.env.TOKEN_ENCRYPTION_KEY?.trim();
  if (explicit) {
    return createHash("sha256").update(explicit).digest();
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "TOKEN_ENCRYPTION_KEY is required in production. Generate one with " +
        "`node -e \"console.log(require('crypto').randomBytes(48).toString('base64'))\"` " +
        "and set it as a secret env var before deploying.",
    );
  }

  // Allow CLERK_SECRET_KEY as a stable fallback so existing dev installs
  // (which encrypted data with that key) keep working.
  const clerkSecret = process.env.CLERK_SECRET_KEY?.trim();
  const secret = clerkSecret || DEV_FALLBACK_KEY;

  if (!warnedAboutDevKey) {
    warnedAboutDevKey = true;
    // eslint-disable-next-line no-console
    console.warn(
      "[growthos] TOKEN_ENCRYPTION_KEY not set — using a dev fallback. " +
        "Set TOKEN_ENCRYPTION_KEY in apps/web/.env.local before storing real " +
        "OAuth tokens or API keys.",
    );
  }

  return createHash("sha256").update(secret).digest();
}

export function encryptToken(token: string) {
  const iv = randomBytes(16);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(token, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return [
    iv.toString("base64url"),
    tag.toString("base64url"),
    encrypted.toString("base64url"),
  ].join(".");
}

export function decryptToken(payload: string) {
  const [ivPart, tagPart, dataPart] = payload.split(".");
  if (!ivPart || !tagPart || !dataPart) {
    throw new Error("Invalid encrypted token payload");
  }

  const iv = Buffer.from(ivPart, "base64url");
  const tag = Buffer.from(tagPart, "base64url");
  const data = Buffer.from(dataPart, "base64url");
  const decipher = createDecipheriv("aes-256-gcm", getEncryptionKey(), iv);
  decipher.setAuthTag(tag);

  return Buffer.concat([decipher.update(data), decipher.final()]).toString(
    "utf8",
  );
}
