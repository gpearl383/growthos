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
  logoUrl: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? value : undefined))
    .pipe(z.union([z.string().url(), z.undefined()])),
  photoUrls: z.array(z.string().url()).max(6).default([]),
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

  await db
    .update(tenants)
    .set({
      slug: nextSlug,
      businessName: data.businessName,
      businessType: data.businessType,
      goal: data.goal,
      offerText: data.offerText,
      onboardingComplete: true,
    })
    .where(eq(tenants.id, tenant.id));

  const existingBrandAssets = await db.query.brandAssets.findFirst({
    where: eq(brandAssets.tenantId, tenant.id),
  });

  if (existingBrandAssets) {
    await db
      .update(brandAssets)
      .set({
        logoUrl: data.logoUrl || null,
        photoUrls: data.photoUrls,
      })
      .where(eq(brandAssets.id, existingBrandAssets.id));
  } else {
    await db.insert(brandAssets).values({
      tenantId: tenant.id,
      logoUrl: data.logoUrl || null,
      photoUrls: data.photoUrls,
    });
  }

  const existingLeadPage = await db.query.leadPages.findFirst({
    where: and(
      eq(leadPages.tenantId, tenant.id),
      eq(leadPages.publicSlug, publicSlug),
    ),
  });

  if (existingLeadPage) {
    await db
      .update(leadPages)
      .set({
        template,
        contentJson,
        published: true,
      })
      .where(eq(leadPages.id, existingLeadPage.id));
  } else {
    await db.insert(leadPages).values({
      tenantId: tenant.id,
      template,
      publicSlug,
      contentJson,
      published: true,
    });
  }

  const presets = buildAutoReplyPresets({
    businessType: data.businessType,
    businessName: data.businessName,
  });

  for (const preset of presets) {
    const existingPreset = await db.query.autoReplyPresets.findFirst({
      where: and(
        eq(autoReplyPresets.tenantId, tenant.id),
        eq(autoReplyPresets.presetKey, preset.presetKey),
      ),
    });

    if (existingPreset) {
      await db
        .update(autoReplyPresets)
        .set({
          enabled: preset.enabled,
          keywords: preset.keywords,
          messageTemplate: preset.messageTemplate,
        })
        .where(eq(autoReplyPresets.id, existingPreset.id));
    } else {
      await db.insert(autoReplyPresets).values({
        tenantId: tenant.id,
        presetKey: preset.presetKey,
        enabled: preset.enabled,
        keywords: preset.keywords,
        messageTemplate: preset.messageTemplate,
      });
    }
  }

  revalidatePath("/get-started");
  revalidatePath("/leads");
  revalidatePath("/create");
  revalidatePath("/auto-replies");
  revalidatePath(`/p/${nextSlug}/${publicSlug}`);

  redirect(`/leads?welcome=1&page=${encodeURIComponent(leadPageUrl)}`);
}
