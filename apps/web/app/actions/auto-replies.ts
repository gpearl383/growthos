"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { setAutoReplyPresetEnabled } from "@/lib/auto-replies";
import { dbConfigured } from "@/lib/env";
import { getOrCreateTenant } from "@/lib/tenant";

export async function toggleAutoReplyPreset(formData: FormData) {
  if (!dbConfigured) {
    return;
  }

  const parsed = z
    .object({
      presetId: z.string().uuid(),
      enabled: z.enum(["true", "false"]),
    })
    .safeParse({
      presetId: formData.get("presetId"),
      enabled: formData.get("enabled"),
    });

  if (!parsed.success) {
    return;
  }

  const tenant = await getOrCreateTenant();

  await setAutoReplyPresetEnabled(
    tenant.id,
    parsed.data.presetId,
    parsed.data.enabled === "true",
  );

  revalidatePath("/auto-replies");
  redirect("/auto-replies?updated=1");
}
