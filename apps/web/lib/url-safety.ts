import { lookup } from "dns/promises";

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
 *
 * NOTE: hostname-string checks only. For full SSRF protection (CNAME to private
 * IP, DNS rebinding) use isSafeFetchUrlAsync which also resolves DNS.
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

/**
 * Async SSRF guard that also resolves DNS so a CNAME pointing to a private
 * IP (e.g. evil.example.com → 169.254.169.254) is caught after the hostname
 * string check passes. Fails closed — if DNS lookup throws, returns false.
 */
export async function isSafeFetchUrlAsync(value: string): Promise<boolean> {
  if (!isSafeFetchUrl(value)) return false;

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }

  // Own origin already allowed by isSafeFetchUrl — skip extra DNS round-trip.
  try {
    if (url.origin === new URL(appUrl()).origin) return true;
  } catch {
    // fall through
  }

  try {
    const { address } = await lookup(url.hostname, { family: 4 });
    if (isPrivateHost(address)) return false;
  } catch {
    // DNS lookup failed — fail closed.
    return false;
  }

  return true;
}
