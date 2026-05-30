"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { dbConfigured } from "@/lib/env";
import {
  getBrandPhotoUrls,
  MAX_BRAND_PHOTOS,
  setBrandPhotoUrls,
} from "@/lib/brand";
import { getOrCreateTenant } from "@/lib/tenant";

const urlSchema = z.string().trim().url();

export type BrandActionState = {
  error?: string;
  success?: string;
};

export async function addBrandPhoto(
  _prevState: BrandActionState,
  formData: FormData,
): Promise<BrandActionState> {
  if (!dbConfigured) {
    return { error: "Database is not configured." };
  }

  const parsed = urlSchema.safeParse(formData.get("url"));
  if (!parsed.success) {
    return { error: "Enter a valid image URL starting with https://" };
  }

  const tenant = await getOrCreateTenant();
  const current = await getBrandPhotoUrls(tenant.id);

  if (current.includes(parsed.data)) {
    return { error: "That photo is already in your library." };
  }

  if (current.length >= MAX_BRAND_PHOTOS) {
    return { error: `You can add up to ${MAX_BRAND_PHOTOS} brand photos.` };
  }

  await setBrandPhotoUrls(tenant.id, [...current, parsed.data]);

  revalidatePath("/settings/brand");
  revalidatePath("/create");

  return { success: "Photo added." };
}

export async function removeBrandPhoto(formData: FormData) {
  if (!dbConfigured) {
    return;
  }

  const url = formData.get("url");
  if (typeof url !== "string") {
    return;
  }

  const tenant = await getOrCreateTenant();
  const current = await getBrandPhotoUrls(tenant.id);
  const next = current.filter((item) => item !== url);

  if (next.length === current.length) {
    return;
  }

  await setBrandPhotoUrls(tenant.id, next);

  revalidatePath("/settings/brand");
  revalidatePath("/create");
}
