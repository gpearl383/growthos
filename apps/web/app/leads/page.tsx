import Link from "next/link";
import { redirect } from "next/navigation";

import { FlashBanner } from "@/components/flash-banner";
import { LeadsInbox } from "@/components/leads/inbox";
import { SetupError } from "@/components/setup-error";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@growthos/ui/card";
import { dbConfigured } from "@/lib/env";
import { getLeadPageUrlForTenant } from "@/lib/lead-pages";
import { listLeadsForTenant } from "@/lib/leads";
import { getOrCreateTenant } from "@/lib/tenant";

type LeadsPageProps = {
  searchParams: Promise<{ welcome?: string; page?: string; updated?: string }>;
};

export default async function LeadsPage({ searchParams }: LeadsPageProps) {
  const params = await searchParams;

  if (!dbConfigured) {
    return (
      <SetupError
        title="Leads inbox needs a database"
        description="Connect a database to persist leads from your lead pages."
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
        title="Could not load your leads inbox"
        description="The app could not reach the database. Run pnpm db:setup and restart the dev server."
        details={message}
      />
    );
  }

  if (!tenant.onboardingComplete) {
    redirect("/get-started");
  }

  try {
    const [leads, leadPageUrl] = await Promise.all([
      listLeadsForTenant(tenant.id),
      getLeadPageUrlForTenant(tenant.id),
    ]);

    return (
      <div className="space-y-6">
        {params.updated === "1" ? (
          <FlashBanner>Lead status updated.</FlashBanner>
        ) : null}

        {params.welcome === "1" && params.page ? (
          <Card className="border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/20">
            <CardHeader>
              <CardTitle>Your lead page is live</CardTitle>
              <CardDescription>
                Share this link in your bio, posts, and auto-replies.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="font-mono text-sm text-emerald-800 dark:text-emerald-300">
                {params.page}
              </p>
              <div className="flex flex-wrap gap-4 text-sm">
                <Link
                  href="/create"
                  className="font-medium text-emerald-700 hover:underline dark:text-emerald-400"
                >
                  Create your first post →
                </Link>
                <Link
                  href="/auto-replies"
                  className="font-medium text-emerald-700 hover:underline dark:text-emerald-400"
                >
                  Review auto-replies →
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : null}

        <LeadsInbox leads={leads} leadPageUrl={leadPageUrl} />
      </div>
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown database error";

    return (
      <SetupError
        title="Could not load your leads inbox"
        description="The app could not reach the database. Run pnpm db:setup and restart the dev server."
        details={message}
      />
    );
  }
}
