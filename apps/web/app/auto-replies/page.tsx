import { redirect } from "next/navigation";

import { AutoReplyPresetList } from "@/components/auto-replies/preset-list";
import { FlashBanner } from "@/components/flash-banner";
import { SetupError } from "@/components/setup-error";
import { listAutoReplyPresetsForTenant } from "@/lib/auto-replies";
import { dbConfigured } from "@/lib/env";
import { getLeadPageUrlForTenant } from "@/lib/lead-pages";
import { getOrCreateTenant } from "@/lib/tenant";

type AutoRepliesPageProps = {
  searchParams: Promise<{ updated?: string }>;
};

export default async function AutoRepliesPage({
  searchParams,
}: AutoRepliesPageProps) {
  const params = await searchParams;
  if (!dbConfigured) {
    return (
      <SetupError
        title="Auto-Replies needs a database"
        description="Connect a database to load your preset replies."
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
        title="Could not load Auto-Replies"
        description="The app could not reach the database. Run pnpm db:setup and restart the dev server."
        details={message}
      />
    );
  }

  if (!tenant.onboardingComplete) {
    redirect("/get-started");
  }

  try {
    const [presets, leadPageUrl] = await Promise.all([
      listAutoReplyPresetsForTenant(tenant.id),
      getLeadPageUrlForTenant(tenant.id),
    ]);

    return (
      <div className="space-y-6">
        {params.updated === "1" ? (
          <FlashBanner>Auto-reply setting saved.</FlashBanner>
        ) : null}

        <AutoReplyPresetList
          presets={presets}
          leadPageUrl={leadPageUrl}
          businessName={tenant.businessName}
        />
      </div>
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown database error";

    return (
      <SetupError
        title="Could not load Auto-Replies"
        description="The app could not reach Postgres. Verify DATABASE_URL and that migrations ran."
        details={message}
      />
    );
  }
}
