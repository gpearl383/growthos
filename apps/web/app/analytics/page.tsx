import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@growthos/ui/card";

import { SetupError } from "@/components/setup-error";
import { getAnalyticsSummary } from "@/lib/analytics";
import { dbConfigured } from "@/lib/env";
import { getOrCreateTenant } from "@/lib/tenant";

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: number | string;
  hint?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
        <p className="mt-1 text-3xl font-semibold tracking-tight">{value}</p>
        {hint ? (
          <p className="mt-1 text-xs text-slate-400">{hint}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function Breakdown({
  title,
  description,
  rows,
}: {
  title: string;
  description: string;
  rows: { label: string; value: number }[];
}) {
  const total = rows.reduce((sum, row) => sum + row.value, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <p className="text-sm text-slate-500">Nothing here yet.</p>
        ) : (
          <ul className="space-y-3">
            {rows.map((row) => {
              const pct = total > 0 ? Math.round((row.value / total) * 100) : 0;
              return (
                <li key={row.label} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600 dark:text-slate-300">
                      {row.label}
                    </span>
                    <span className="font-medium">{row.value}</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className="h-full rounded-full bg-emerald-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export default async function AnalyticsPage() {
  if (!dbConfigured) {
    return (
      <SetupError
        title="Analytics needs a database"
        description="Connect a database to track leads, posts, and engagement."
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
        title="Could not load analytics"
        description="The app could not reach the database. Run pnpm db:setup and restart the dev server."
        details={message}
      />
    );
  }

  if (!tenant.onboardingComplete) {
    redirect("/get-started");
  }

  try {
    const summary = await getAnalyticsSummary(tenant.id);

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            How your leads and content are doing.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total leads"
            value={summary.leads.total}
            hint={`${summary.leads.thisWeek} new this week`}
          />
          <StatCard
            label="Open leads"
            value={summary.leads.open}
            hint="New, contacted, or booked"
          />
          <StatCard
            label="Won"
            value={summary.leads.won}
            hint="Leads marked won"
          />
          <StatCard
            label="Posts published"
            value={summary.posts.byStatus.published}
            hint={`${summary.posts.byStatus.scheduled} scheduled, ${summary.posts.byStatus.draft} drafts`}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Breakdown
            title="Leads by status"
            description="Where your leads are in the pipeline."
            rows={[
              { label: "New", value: summary.leads.byStatus.new },
              { label: "Contacted", value: summary.leads.byStatus.contacted },
              { label: "Booked", value: summary.leads.byStatus.booked },
              { label: "Won", value: summary.leads.byStatus.won },
              { label: "Lost", value: summary.leads.byStatus.lost },
              { label: "Archived", value: summary.leads.byStatus.archived },
            ]}
          />
          <Breakdown
            title="Posts by status"
            description="Your content pipeline."
            rows={[
              { label: "Draft", value: summary.posts.byStatus.draft },
              { label: "Scheduled", value: summary.posts.byStatus.scheduled },
              { label: "Published", value: summary.posts.byStatus.published },
              { label: "Copied", value: summary.posts.byStatus.copied },
              { label: "Failed", value: summary.posts.byStatus.failed },
            ]}
          />
          <Breakdown
            title="Engagement events"
            description={`${summary.events.thisWeek} in the last 7 days.`}
            rows={[
              { label: "Page views", value: summary.events.byType.page_view },
              { label: "Clicks", value: summary.events.byType.click },
              {
                label: "Form submits",
                value: summary.events.byType.form_submit,
              },
              { label: "Bookings", value: summary.events.byType.booking },
              { label: "DMs sent", value: summary.events.byType.dm_sent },
            ]}
          />
        </div>
      </div>
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown database error";
    return (
      <SetupError
        title="Could not load analytics"
        description="The database schema may be out of date. Run pnpm db:setup, then restart the dev server."
        details={message}
      />
    );
  }
}
