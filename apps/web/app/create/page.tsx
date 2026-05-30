import { redirect } from "next/navigation";
import { eq } from "@growthos/db";
import { brandAssets } from "@growthos/db";

import { DraftsList } from "@/components/create/drafts-list";
import { PostStudio } from "@/components/create/post-studio";
import type { StudioAsset } from "@/components/create/studio";
import { FlashBanner } from "@/components/flash-banner";
import { SetupError } from "@/components/setup-error";
import {
  anthropicConfigured,
  canvaConfigured,
  dbConfigured,
  elevenlabsConfigured,
  openaiConfigured,
} from "@/lib/env";
import { getDb } from "@/lib/db";
import { listMediaAssetsForTenant } from "@/lib/media/assets";
import { listPostsForTenant } from "@/lib/posts";
import { listSocialAccountsForTenant } from "@/lib/social-accounts";
import { getOrCreateTenant } from "@/lib/tenant";

type CreatePageProps = {
  searchParams: Promise<{
    saved?: string;
    error?: string;
    resume?: string;
    canva?: string;
  }>;
};

export default async function CreatePage({ searchParams }: CreatePageProps) {
  const params = await searchParams;

  if (!dbConfigured) {
    return (
      <SetupError
        title="Create & Post needs a database"
        description="Connect a database to save generated posts."
        details="Add DATABASE_URL to apps/web/.env.local and run migrations."
      />
    );
  }

  let tenant;
  try {
    tenant = await getOrCreateTenant();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown database error";

    return (
      <SetupError
        title="Could not load Create & Post"
        description="The app could not reach the database. Run pnpm db:setup and restart the dev server."
        details={message}
      />
    );
  }

  if (!tenant.onboardingComplete) {
    redirect("/get-started");
  }

  try {
    const db = getDb();
    const brand = await db.query.brandAssets.findFirst({
      where: eq(brandAssets.tenantId, tenant.id),
    });
    const drafts = await listPostsForTenant(tenant.id);
    const mediaAssets = await listMediaAssetsForTenant(tenant.id);
    const accounts = await listSocialAccountsForTenant(tenant.id);

    const isConnected = (platform: "instagram" | "facebook" | "tiktok") =>
      accounts.find((account) => account.platform === platform)?.status ===
      "connected";

    const resumeDraft = params.resume
      ? drafts.find((draft) => draft.id === params.resume)
      : undefined;
    const initialDraft = resumeDraft
      ? {
          platform: resumeDraft.platform,
          hook: resumeDraft.hook ?? "",
          caption: resumeDraft.caption ?? "",
          hashtags: resumeDraft.hashtags ?? "",
          altText: resumeDraft.altText ?? "",
          mediaUrl: resumeDraft.mediaUrl ?? "",
          mediaType: resumeDraft.mediaType ?? null,
          audioUrl: resumeDraft.audioUrl ?? "",
        }
      : undefined;

    const photoUrls = brand?.photoUrls ?? [];
    const studioAssets: StudioAsset[] = [
      ...mediaAssets.map((asset) => ({
        id: asset.id,
        url: asset.url,
        type: asset.type,
        altText: asset.altText,
        source: asset.source,
      })),
      ...photoUrls.map((url) => ({
        url,
        type: "image" as const,
        altText: null,
        source: "brand",
      })),
    ];

    return (
      <div className="space-y-6">
        {params.saved === "draft" ? (
          <FlashBanner>Draft saved. Find it in Saved drafts below.</FlashBanner>
        ) : null}
        {params.saved === "scheduled" ? (
          <FlashBanner>
            Post scheduled. It will publish automatically when the platform is
            connected.
          </FlashBanner>
        ) : null}
        {params.error === "schedule" ? (
          <FlashBanner variant="error">
            Pick a date and time in the future to schedule this post.
          </FlashBanner>
        ) : null}
        {params.canva === "connected" ? (
          <FlashBanner>
            Canva connected. Use &quot;Open Canva editor&quot; to design your
            post.
          </FlashBanner>
        ) : null}
        {params.canva && params.canva !== "connected" ? (
          <FlashBanner variant="error">
            Canva connection issue: {params.canva.replace(/_/g, " ")}
          </FlashBanner>
        ) : null}

        <PostStudio
          key={resumeDraft?.id ?? "new"}
          businessName={tenant.businessName ?? "Your business"}
          aiConfigured={anthropicConfigured}
          assets={studioAssets}
          connected={{
            instagram: isConnected("instagram"),
            facebook: isConnected("facebook"),
            tiktok: isConnected("tiktok"),
          }}
          configured={{
            openai: openaiConfigured,
            elevenlabs: elevenlabsConfigured,
            canva: canvaConfigured,
          }}
          initialDraft={initialDraft}
        />
        <DraftsList drafts={drafts} activeId={resumeDraft?.id} />
      </div>
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown database error";

    return (
      <SetupError
        title="Could not load Create & Post"
        description="The database schema may be out of date. Run pnpm db:setup from the repo root, then restart the dev server."
        details={message}
      />
    );
  }
}
