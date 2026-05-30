import { and, eq } from "@growthos/db";
import { tenantSecrets } from "@growthos/db";

import { getDb } from "@/lib/db";
import { decryptToken, encryptToken } from "@/lib/meta/token-crypto";

export const SECRET_PROVIDERS = ["anthropic", "openai", "elevenlabs"] as const;

export type SecretProvider = (typeof SECRET_PROVIDERS)[number];

type ProviderConfig = {
  label: string;
  envVar: string;
  docsUrl: string;
  helpText: string;
  placeholder: string;
  /** Lightweight format check to catch obvious paste mistakes. */
  validate: (value: string) => boolean;
};

export const PROVIDER_CONFIG: Record<SecretProvider, ProviderConfig> = {
  anthropic: {
    label: "Anthropic (Claude)",
    envVar: "ANTHROPIC_API_KEY",
    docsUrl: "https://console.anthropic.com/settings/keys",
    helpText: "Powers AI copy, the studio copilot, and image understanding.",
    placeholder: "sk-ant-...",
    validate: (value) => value.startsWith("sk-ant-") && value.length > 20,
  },
  openai: {
    label: "OpenAI",
    envVar: "OPENAI_API_KEY",
    docsUrl: "https://platform.openai.com/api-keys",
    helpText: "Generates images from a text prompt in the Enhance tools.",
    placeholder: "sk-...",
    validate: (value) => value.startsWith("sk-") && value.length > 20,
  },
  elevenlabs: {
    label: "ElevenLabs",
    envVar: "ELEVENLABS_API_KEY",
    docsUrl: "https://elevenlabs.io/app/settings/api-keys",
    helpText: "Turns captions into voiceover audio.",
    placeholder: "Your ElevenLabs API key",
    validate: (value) => value.length >= 20,
  },
};

export function isSecretProvider(value: unknown): value is SecretProvider {
  return (
    typeof value === "string" &&
    (SECRET_PROVIDERS as readonly string[]).includes(value)
  );
}

function envKey(provider: SecretProvider): string | undefined {
  const value = process.env[PROVIDER_CONFIG[provider].envVar]?.trim();
  return value ? value : undefined;
}

/**
 * Resolves the API key for a tenant+provider: a saved (encrypted) tenant key
 * takes priority, otherwise we fall back to the environment variable. Returns
 * undefined when neither is set, so callers can show setup hints.
 */
export async function resolveApiKey(
  tenantId: string,
  provider: SecretProvider,
): Promise<string | undefined> {
  const db = getDb();
  const row = await db.query.tenantSecrets.findFirst({
    where: and(
      eq(tenantSecrets.tenantId, tenantId),
      eq(tenantSecrets.provider, provider),
    ),
  });

  if (row?.valueEnc) {
    try {
      return decryptToken(row.valueEnc);
    } catch {
      // Corrupt/legacy ciphertext — fall back to env below.
    }
  }

  return envKey(provider);
}

export async function setApiKey(
  tenantId: string,
  provider: SecretProvider,
  rawValue: string,
) {
  const db = getDb();
  const value = rawValue.trim();
  const valueEnc = encryptToken(value);
  const last4 = value.slice(-4);

  const existing = await db.query.tenantSecrets.findFirst({
    where: and(
      eq(tenantSecrets.tenantId, tenantId),
      eq(tenantSecrets.provider, provider),
    ),
  });

  if (existing) {
    await db
      .update(tenantSecrets)
      .set({ valueEnc, last4, updatedAt: new Date() })
      .where(eq(tenantSecrets.id, existing.id));
    return;
  }

  await db.insert(tenantSecrets).values({
    tenantId,
    provider,
    valueEnc,
    last4,
  });
}

export async function removeApiKey(
  tenantId: string,
  provider: SecretProvider,
) {
  const db = getDb();
  await db
    .delete(tenantSecrets)
    .where(
      and(
        eq(tenantSecrets.tenantId, tenantId),
        eq(tenantSecrets.provider, provider),
      ),
    );
}

export type SecretSource = "tenant" | "env" | "none";

export type SecretStatus = {
  provider: SecretProvider;
  label: string;
  helpText: string;
  docsUrl: string;
  placeholder: string;
  configured: boolean;
  source: SecretSource;
  last4: string | null;
  envFallback: boolean;
};

export async function getSecretStatuses(
  tenantId: string,
): Promise<SecretStatus[]> {
  const db = getDb();
  const rows = await db.query.tenantSecrets.findMany({
    where: eq(tenantSecrets.tenantId, tenantId),
  });
  const byProvider = new Map(rows.map((row) => [row.provider, row]));

  return SECRET_PROVIDERS.map((provider) => {
    const config = PROVIDER_CONFIG[provider];
    const row = byProvider.get(provider);
    const envFallback = Boolean(envKey(provider));
    const source: SecretSource = row ? "tenant" : envFallback ? "env" : "none";

    return {
      provider,
      label: config.label,
      helpText: config.helpText,
      docsUrl: config.docsUrl,
      placeholder: config.placeholder,
      configured: source !== "none",
      source,
      last4: row?.last4 ?? null,
      envFallback,
    };
  });
}
