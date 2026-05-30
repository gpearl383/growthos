import { redirect } from "next/navigation";

import { GetStartedWizard } from "@/components/get-started/wizard";
import { SetupError } from "@/components/setup-error";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@growthos/ui/card";
import { dbConfigured } from "@/lib/env";
import { getOrCreateTenant } from "@/lib/tenant";

export default async function GetStartedPage() {
  if (!dbConfigured) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Database required</CardTitle>
          <CardDescription>
            Add <code>DATABASE_URL</code> to <code>apps/web/.env.local</code>{" "}
            and run migrations before using the Get Started wizard.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-slate-600">
          <p>
            From the repo root:{" "}
            <code>psql &quot;$DATABASE_URL&quot; -f packages/db/migrations/0000_init.sql</code>
          </p>
          <p>
            Then restart the dev server:{" "}
            <code>pnpm --filter @growthos/web dev:clean</code>
          </p>
        </CardContent>
      </Card>
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
        title="Could not connect to the database"
        description="Check DATABASE_URL in apps/web/.env.local and confirm migrations have been applied."
        details={message}
      />
    );
  }

  if (tenant.onboardingComplete) {
    redirect("/leads");
  }

  return (
    <GetStartedWizard
      tenantSlug={tenant.slug}
      initialBusinessName={tenant.businessName}
    />
  );
}
