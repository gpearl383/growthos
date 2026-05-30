import { appUrl } from "@/lib/env";

/** True only for absolute http(s) URLs (rejects javascript:, data:, file:, etc.). */
export function isHttpUrl(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  return url.protocol === "http:" || url.protocol === "https:";
}

const PRIVATE_HOST_PATTERNS = [
  /^localhost$/i,
  /\.local$/i,
  /\.internal$/i,
  /^127\./,
  /^10\./,
  /^0\./,
  /^169\.254\./, // link-local / cloud metadata
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^::1$/,
  /^fc00:/i,
  /^fd[0-9a-f]{2}:/i,
  /^fe80:/i,
];

function isPrivateHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  return PRIVATE_HOST_PATTERNS.some((pattern) => pattern.test(host));
}

/**
 * Guards server-side fetches against SSRF. Allows the app's own origin (so we
 * can read our locally-served media, even on localhost), and otherwise requires
 * a public http(s) host — blocking loopback, private ranges, and link-local /
 * cloud-metadata addresses.
 */
export function isSafeFetchUrl(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return false;
  }

  try {
    if (url.origin === new URL(appUrl()).origin) {
      return true;
    }
  } catch {
    // appUrl misconfigured — fall through to private-host check
  }

  return !isPrivateHost(url.hostname);
}
