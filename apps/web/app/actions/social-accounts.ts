"use server";

import { revalidatePath } from "next/cache";

import { disconnectSocialAccount } from "@/lib/social-accounts";
import { dbConfigured } from "@/lib/env";
import { SOCIAL_PLATFORMS } from "@/lib/platforms";
import { getOrCreateTenant } from "@/lib/tenant";

export async function disconnectPlatform(formData: FormData) {
  if (!dbConfigured) {
    return;
  }

  const platform = formData.get("platform");
  if (
    typeof platform !== "string" ||
    !SOCIAL_PLATFORMS.includes(platform as (typeof SOCIAL_PLATFORMS)[number])
  ) {
    return;
  }

  const tenant = await getOrCreateTenant();
  await disconnectSocialAccount(
    tenant.id,
    platform as (typeof SOCIAL_PLATFORMS)[number],
  );
  revalidatePath("/settings/connections");
}
