"use server";

import { and, eq } from "@growthos/db";
import {
  autoReplyPresets,
  brandAssets,
  leadPages,
  tenants,
} from "@growthos/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getDb } from "@/lib/db";
import { appUrl, dbConfigured } from "@/lib/env";
import {
  buildAutoReplyPresets,
  buildLeadPageContent,
  goalToTemplate,
} from "@/lib/onboarding/constants";
import { ensureUniqueTenantSlug, getOrCreateTenant } from "@/lib/tenant";
import { slugify } from "@/lib/slug";
import { isHttpUrl } from "@/lib/url-safety";

const onboardingSchema = z.object({
  businessName: z.string().trim().min(2, "Business name is required"),
  businessType: z.enum([
    "local_services",
    "salon",
    "food",
    "professional",
    "other",
  ]),
  goal: z.enum([
    "bookings",
    "quotes",
    "email_list",
    "store_visits",
    "followers",
  ]),
  offerText: z.string().trim().min(10, "Describe your offer in one sentence"),
  websiteUrl: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? value : undefined))
    .pipe(z.union([z.string().url().refine(isHttpUrl, "Use an http(s) URL"), z.undefined()])),
  logoUrl: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? value : undefined))
    .pipe(z.union([z.string().url().refine(isHttpUrl, "Use an http(s) URL"), z.undefined()])),
  photoUrls: z
    .array(z.string().url().refine(isHttpUrl, "Use an http(s) URL"))
    .max(6)
    .default([]),
});

export type OnboardingActionState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

export async function completeOnboarding(
  _prev: OnboardingActionState,
  formData: FormData,
): Promise<OnboardingActionState> {
  if (!dbConfigured) {
    return { error: "Database is not configured. Add DATABASE_URL to continue." };
  }

  const photoUrlsRaw = formData.get("photoUrls");
  const photoUrls =
    typeof photoUrlsRaw === "string"
      ? photoUrlsRaw
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean)
      : [];

  const parsed = onboardingSchema.safeParse({
    businessName: formData.get("businessName"),
    businessType: formData.get("businessType"),
    goal: formData.get("goal"),
    offerText: formData.get("offerText"),
    websiteUrl: formData.get("websiteUrl") || undefined,
    logoUrl: formData.get("logoUrl") || undefined,
    photoUrls,
  });

  if (!parsed.success) {
    return {
      fieldErrors: parsed.error.flatten().fieldErrors as Record<
        string,
        string[]
      >,
    };
  }

  const data = parsed.data;
  const db = getDb();
  const tenant = await getOrCreateTenant();

  const nextSlug = await ensureUniqueTenantSlug(
    slugify(data.businessName),
    tenant.id,
  );

  const template = goalToTemplate(data.goal);
  const contentJson = buildLeadPageContent({
    businessName: data.businessName,
    offerText: data.offerText,
    goal: data.goal,
    template,
  });

  const publicSlug = "offer";
  const leadPageUrl = `${appUrl()}/p/${nextSlug}/${publicSlug}`;

  const presets = buildAutoReplyPresets({
    businessType: data.businessType,
    businessName: data.businessName,
  });

  // All onboarding writes go through one transaction so a partial failure
  // doesn't leave a half-onboarded tenant (e.g. flipped onboardingComplete=true
  // but no lead page / auto-reply presets).
  await db.transaction(async (tx) => {
    await tx
      .update(tenants)
      .set({
        slug: nextSlug,
        businessName: data.businessName,
        businessType: data.businessType,
        goal: data.goal,
        offerText: data.offerText,
        websiteUrl: data.websiteUrl || null,
        onboardingComplete: true,
      })
      .where(eq(tenants.id, tenant.id));

    const existingBrandAssets = await tx.query.brandAssets.findFirst({
      where: eq(brandAssets.tenantId, tenant.id),
    });

    if (existingBrandAssets) {
      await tx
        .update(brandAssets)
        .set({
          logoUrl: data.logoUrl || null,
          photoUrls: data.photoUrls,
        })
        .where(eq(brandAssets.id, existingBrandAssets.id));
    } else {
      await tx.insert(brandAssets).values({
        tenantId: tenant.id,
        logoUrl: data.logoUrl || null,
        photoUrls: data.photoUrls,
      });
    }

    const existingLeadPage = await tx.query.leadPages.findFirst({
      where: and(
        eq(leadPages.tenantId, tenant.id),
        eq(leadPages.publicSlug, publicSlug),
      ),
    });

    if (existingLeadPage) {
      await tx
        .update(leadPages)
        .set({
          template,
          contentJson,
          published: true,
        })
        .where(eq(leadPages.id, existingLeadPage.id));
    } else {
      await tx.insert(leadPages).values({
        tenantId: tenant.id,
        template,
        publicSlug,
        contentJson,
        published: true,
      });
    }

    for (const preset of presets) {
      const existingPreset = await tx.query.autoReplyPresets.findFirst({
        where: and(
          eq(autoReplyPresets.tenantId, tenant.id),
          eq(autoReplyPresets.presetKey, preset.presetKey),
        ),
      });

      if (existingPreset) {
        await tx
          .update(autoReplyPresets)
          .set({
            enabled: preset.enabled,
            keywords: preset.keywords,
            messageTemplate: preset.messageTemplate,
          })
          .where(eq(autoReplyPresets.id, existingPreset.id));
      } else {
        await tx.insert(autoReplyPresets).values({
          tenantId: tenant.id,
          presetKey: preset.presetKey,
          enabled: preset.enabled,
          keywords: preset.keywords,
          messageTemplate: preset.messageTemplate,
        });
      }
    }
  });

  revalidatePath("/get-started");
  revalidatePath("/leads");
  revalidatePath("/create");
  revalidatePath("/auto-replies");
  revalidatePath(`/p/${nextSlug}/${publicSlug}`);

  redirect(`/leads?welcome=1&page=${encodeURIComponent(leadPageUrl)}`);
}
