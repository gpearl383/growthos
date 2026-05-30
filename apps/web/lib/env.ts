export const clerkConfigured = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.startsWith("pk_") &&
    process.env.CLERK_SECRET_KEY?.startsWith("sk_"),
);

function hasValidDatabaseUrl() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    return false;
  }

  if (url.includes("[YOUR-PASSWORD]")) {
    return false;
  }

  return true;
}

export const useLocalDb =
  process.env.USE_LOCAL_DB === "true" ||
  (process.env.USE_LOCAL_DB !== "false" &&
    !hasValidDatabaseUrl() &&
    process.env.NODE_ENV !== "production");

export const dbConfigured = useLocalDb || hasValidDatabaseUrl();

export const anthropicConfigured = Boolean(process.env.ANTHROPIC_API_KEY);

export const resendConfigured = Boolean(process.env.RESEND_API_KEY);

export const inngestConfigured = Boolean(
  process.env.INNGEST_EVENT_KEY || process.env.INNGEST_SIGNING_KEY,
);

export const metaConfigured = Boolean(
  process.env.META_APP_ID && process.env.META_APP_SECRET,
);

export const tiktokConfigured = Boolean(
  process.env.TIKTOK_CLIENT_KEY && process.env.TIKTOK_CLIENT_SECRET,
);

export const openaiConfigured = Boolean(process.env.OPENAI_API_KEY);

export const elevenlabsConfigured = Boolean(process.env.ELEVENLABS_API_KEY);

export const canvaConfigured = Boolean(
  process.env.CANVA_CLIENT_ID && process.env.CANVA_CLIENT_SECRET,
);

export function metaWebhookVerifyToken() {
  return process.env.META_WEBHOOK_VERIFY_TOKEN ?? "growthos-dev-verify";
}

export function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

export function resendFromAddress() {
  return process.env.RESEND_FROM ?? "GrowthOS <hello@growthos.app>";
}
