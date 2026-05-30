"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { eq, tenants } from "@growthos/db";

import { getDb } from "@/lib/db";
import { dbConfigured } from "@/lib/env";
import {
  getBrandPhotoUrls,
  MAX_BRAND_PHOTOS,
  setBrandPhotoUrls,
} from "@/lib/brand";
import { getOrCreateTenant } from "@/lib/tenant";
import { isHttpUrl } from "@/lib/url-safety";

const urlSchema = z
  .string()
  .trim()
  .url()
  .refine(isHttpUrl, "Use an image URL starting with http:// or https://");

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

const websiteSchema = z
  .string()
  .trim()
  .max(2048, "URL is too long")
  .optional()
  .transform((value) => (value && value.length > 0 ? value : undefined))
  .pipe(
    z.union([
      z
        .string()
        .url("Use a full URL starting with http:// or https://")
        .refine(isHttpUrl, "Use a full URL starting with http:// or https://"),
      z.undefined(),
    ]),
  );

export type WebsiteActionState = {
  error?: string;
  success?: string;
  websiteUrl?: string | null;
};

export async function updateBusinessWebsite(
  _prevState: WebsiteActionState,
  formData: FormData,
): Promise<WebsiteActionState> {
  if (!dbConfigured) {
    return { error: "Database is not configured." };
  }

  const parsed = websiteSchema.safeParse(formData.get("websiteUrl"));
  if (!parsed.success) {
    return {
      error:
        parsed.error.issues[0]?.message ??
        "Use a full URL starting with http:// or https://",
    };
  }

  const tenant = await getOrCreateTenant();
  const db = getDb();
  const nextValue = parsed.data ?? null;

  await db
    .update(tenants)
    .set({ websiteUrl: nextValue })
    .where(eq(tenants.id, tenant.id));

  revalidatePath("/settings/brand");
  revalidatePath("/create");
  if (tenant.slug) {
    revalidatePath(`/p/${tenant.slug}/offer`);
  }

  return {
    success: nextValue ? "Website saved." : "Website cleared.",
    websiteUrl: nextValue,
  };
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
