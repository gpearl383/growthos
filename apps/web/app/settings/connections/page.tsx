import { redirect } from "next/navigation";

import { ConnectionsPanel } from "@/components/settings/connections-panel";
import { SetupError } from "@/components/setup-error";
import { dbConfigured } from "@/lib/env";
import { listSocialAccountsForTenant } from "@/lib/social-accounts";
import { getOrCreateTenant } from "@/lib/tenant";

type ConnectionsPageProps = {
  searchParams: Promise<{ connected?: string; error?: string }>;
};

const ERROR_MESSAGES: Record<string, string> = {
  meta_not_configured:
    "Add META_APP_ID and META_APP_SECRET to connect Instagram and Facebook.",
  tiktok_not_configured:
    "Add TIKTOK_CLIENT_KEY and TIKTOK_CLIENT_SECRET to connect TikTok.",
  invalid_callback: "Meta login did not complete. Try connecting again.",
  invalid_state: "Your login session expired. Try connecting again.",
  tenant_not_found: "Could not find your business account.",
  no_pages_found:
    "No Facebook Pages or Instagram business accounts were found on this Meta login.",
};

export default async function ConnectionsPage({
  searchParams,
}: ConnectionsPageProps) {
  const params = await searchParams;

  if (!dbConfigured) {
    return (
      <SetupError
        title="Connections need a database"
        description="Connect a database before linking social accounts."
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
        title="Could not load Connections"
        description="The app could not reach the database. Run pnpm db:setup and restart the dev server."
        details={message}
      />
    );
  }

  if (!tenant.onboardingComplete) {
    redirect("/get-started");
  }

  try {
    const accounts = await listSocialAccountsForTenant(tenant.id);
    const errorMessage = params.error
      ? (ERROR_MESSAGES[params.error] ?? decodeURIComponent(params.error))
      : undefined;

    return (
      <ConnectionsPanel
        accounts={accounts}
        connected={params.connected}
        error={errorMessage}
      />
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown database error";

    return (
      <SetupError
        title="Could not load Connections"
        description="The app could not reach Postgres. Verify DATABASE_URL and that migrations ran."
        details={message}
      />
    );
  }
}
