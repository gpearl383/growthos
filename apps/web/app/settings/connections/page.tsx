import { redirect } from "next/navigation";

import { ConnectionsPanel } from "@/components/settings/connections-panel";
import { SetupError } from "@/components/setup-error";
import { dbConfigured } from "@/lib/env";
import { listSocialAccountsForTenant } from "@/lib/social-accounts";
import { getOrCreateTenant } from "@/lib/tenant";

type ConnectionsPageProps = {
  searchParams: Promise<{ connected?: string; error?: string }>;
};

const ERROR_LABELS: Record<string, string> = {
  meta_not_configured: "Meta is not configured.",
  tiktok_not_configured: "TikTok is not configured.",
  invalid_callback: "OAuth callback was invalid.",
  invalid_state: "OAuth state was invalid or expired.",
  tenant_not_found: "Could not find your account.",
  session_mismatch: "Session mismatch — please try again.",
  no_pages_found: "No Facebook pages or Instagram accounts found.",
  not_signed_in: "You must be signed in.",
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
      ? (ERROR_LABELS[params.error] ?? "An unknown error occurred.")
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
