import { redirect } from "next/navigation";

import { BrandPhotosPanel } from "@/components/settings/brand-photos-panel";
import { SetupError } from "@/components/setup-error";
import { getBrandPhotoUrls, MAX_BRAND_PHOTOS } from "@/lib/brand";
import { dbConfigured } from "@/lib/env";
import { getOrCreateTenant } from "@/lib/tenant";

export default async function BrandSettingsPage() {
  if (!dbConfigured) {
    return (
      <SetupError
        title="Brand settings need a database"
        description="Connect a database to manage your brand photos."
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
        title="Could not load brand settings"
        description="The app could not reach the database. Run pnpm db:setup and restart the dev server."
        details={message}
      />
    );
  }

  if (!tenant.onboardingComplete) {
    redirect("/get-started");
  }

  try {
    const photos = await getBrandPhotoUrls(tenant.id);

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Brand</h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Manage the photos available to the Post Studio.
          </p>
        </div>
        <BrandPhotosPanel photos={photos} maxPhotos={MAX_BRAND_PHOTOS} />
      </div>
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown database error";
    return (
      <SetupError
        title="Could not load brand settings"
        description="The database schema may be out of date. Run pnpm db:setup, then restart the dev server."
        details={message}
      />
    );
  }
}
