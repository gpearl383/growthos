"use server";

import { revalidatePath } from "next/cache";

import { dbConfigured } from "@/lib/env";
import {
  isSecretProvider,
  PROVIDER_CONFIG,
  removeApiKey,
  setApiKey,
} from "@/lib/secrets";
import { getOrCreateTenant } from "@/lib/tenant";

export type ApiKeyActionState = {
  error?: string;
  success?: string;
};

export async function saveApiKey(
  _prevState: ApiKeyActionState,
  formData: FormData,
): Promise<ApiKeyActionState> {
  if (!dbConfigured) {
    return { error: "Database is not configured." };
  }

  const provider = formData.get("provider");
  const value = formData.get("value");

  if (!isSecretProvider(provider)) {
    return { error: "Unknown provider." };
  }

  if (typeof value !== "string" || value.trim().length === 0) {
    return { error: "Paste an API key first." };
  }

  const config = PROVIDER_CONFIG[provider];
  const trimmed = value.trim();

  if (!config.validate(trimmed)) {
    return {
      error: `That doesn't look like a valid ${config.label} key (expected something like "${config.placeholder}").`,
    };
  }

  const tenant = await getOrCreateTenant();
  await setApiKey(tenant.id, provider, trimmed);

  revalidatePath("/settings/api-keys");
  revalidatePath("/create");

  return { success: `${config.label} key saved.` };
}

export async function deleteApiKey(formData: FormData) {
  if (!dbConfigured) {
    return;
  }

  const provider = formData.get("provider");
  if (!isSecretProvider(provider)) {
    return;
  }

  const tenant = await getOrCreateTenant();
  await removeApiKey(tenant.id, provider);

  revalidatePath("/settings/api-keys");
  revalidatePath("/create");
}
