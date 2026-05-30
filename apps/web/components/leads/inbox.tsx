import { Button } from "@growthos/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@growthos/ui/card";

import { setLeadStatus } from "@/app/actions/leads";
import {
  formatLeadSource,
  formatLeadStatus,
  normalizePhoneForLink,
  type LeadRecord,
  type LeadStatus,
} from "@/lib/leads";

type LeadsInboxProps = {
  leads: LeadRecord[];
  leadPageUrl?: string | null;
};

const statusStyles: Record<LeadStatus, string> = {
  new: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  contacted: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  booked: "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300",
  won: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  lost: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  archived: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-500",
};

function formatRelativeTime(date: Date) {
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60_000);

  if (diffMinutes < 1) {
    return "Just now";
  }

  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function LeadActions({ lead }: { lead: LeadRecord }) {
  const phoneLink = normalizePhoneForLink(lead.phone);

  return (
    <div className="flex flex-wrap gap-2">
      {phoneLink ? (
        <>
          <a
            href={`tel:${phoneLink}`}
            className="inline-flex h-9 items-center justify-center rounded-md bg-emerald-600 px-3 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Call
          </a>
          <a
            href={`sms:${phoneLink}`}
            className="inline-flex h-9 items-center justify-center rounded-md bg-slate-100 px-3 text-sm font-medium text-slate-900 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
          >
            Text
          </a>
        </>
      ) : null}

      {lead.status === "new" ? (
        <form action={setLeadStatus}>
          <input type="hidden" name="leadId" value={lead.id} />
          <input type="hidden" name="status" value="contacted" />
          <Button type="submit" size="sm" variant="outline">
            Mark contacted
          </Button>
        </form>
      ) : null}

      {lead.status !== "booked" && lead.status !== "won" ? (
        <form action={setLeadStatus}>
          <input type="hidden" name="leadId" value={lead.id} />
          <input type="hidden" name="status" value="booked" />
          <Button type="submit" size="sm" variant="outline">
            Mark booked
          </Button>
        </form>
      ) : null}

      {lead.status !== "won" ? (
        <form action={setLeadStatus}>
          <input type="hidden" name="leadId" value={lead.id} />
          <input type="hidden" name="status" value="won" />
          <Button type="submit" size="sm" variant="ghost">
            Mark won
          </Button>
        </form>
      ) : null}
    </div>
  );
}

export function LeadsInbox({ leads, leadPageUrl }: LeadsInboxProps) {
  if (leads.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No leads yet</CardTitle>
          <CardDescription>
            Share your lead page link in your bio, posts, and auto-replies. New
            submissions will show up here instantly.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {leadPageUrl ? (
            <p className="font-mono text-sm text-slate-700 dark:text-slate-300">
              {leadPageUrl}
            </p>
          ) : null}
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Tip: Turn on auto-replies so commenters get your link automatically.
          </p>
        </CardContent>
      </Card>
    );
  }

  const newCount = leads.filter((lead) => lead.status === "new").length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Leads</h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {leads.length} total
            {newCount > 0 ? ` · ${newCount} new` : ""}
          </p>
        </div>
      </div>

      <ul className="space-y-3">
        {leads.map((lead) => (
          <li key={lead.id}>
            <Card>
              <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-lg font-medium">{lead.name}</p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusStyles[lead.status]}`}
                    >
                      {formatLeadStatus(lead.status)}
                    </span>
                  </div>

                  <div className="space-y-1 text-sm text-slate-600 dark:text-slate-300">
                    {lead.phone ? <p>{lead.phone}</p> : null}
                    {lead.email ? <p>{lead.email}</p> : null}
                    <p>
                      {formatLeadSource(lead.source)} ·{" "}
                      {formatRelativeTime(lead.createdAt)}
                    </p>
                  </div>
                </div>

                <LeadActions lead={lead} />
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
