import { redirect } from "next/navigation";

import { ApiKeysPanel } from "@/components/settings/api-keys-panel";
import { SetupError } from "@/components/setup-error";
import { dbConfigured } from "@/lib/env";
import { getSecretStatuses } from "@/lib/secrets";
import { getOrCreateTenant } from "@/lib/tenant";

export default async function ApiKeysSettingsPage() {
  if (!dbConfigured) {
    return (
      <SetupError
        title="API keys need a database"
        description="Connect a database to store your provider keys."
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
        title="Could not load API keys"
        description="The app could not reach the database. Run pnpm db:setup and restart the dev server."
        details={message}
      />
    );
  }

  if (!tenant.onboardingComplete) {
    redirect("/get-started");
  }

  try {
    const statuses = await getSecretStatuses(tenant.id);

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">API keys</h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Connect AI providers without touching any config files.
          </p>
        </div>
        <ApiKeysPanel statuses={statuses} />
      </div>
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown database error";
    return (
      <SetupError
        title="Could not load API keys"
        description="The database schema may be out of date. Run pnpm db:setup, then restart the dev server."
        details={message}
      />
    );
  }
}
