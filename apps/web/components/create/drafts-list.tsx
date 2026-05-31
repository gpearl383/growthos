import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@growthos/ui/card";

import { DeleteDraftButton } from "@/components/create/delete-draft-button";
import { formatPostStatus, type PostRecord } from "@/lib/posts";

type DraftsListProps = {
  drafts: PostRecord[];
  activeId?: string;
};

export function DraftsList({ drafts, activeId }: DraftsListProps) {
  if (drafts.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Saved drafts</CardTitle>
        <CardDescription>
          Posts you&apos;ve saved — resume editing in the studio above.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {drafts.map((draft) => (
            <li
              key={draft.id}
              className={`flex gap-4 rounded-md border p-4 ${
                draft.id === activeId
                  ? "border-emerald-400 bg-emerald-50/50 dark:border-emerald-600 dark:bg-emerald-950/20"
                  : "border-slate-200 dark:border-slate-800"
              }`}
            >
              {draft.mediaUrl ? (
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md bg-slate-100 dark:bg-slate-900">
                  {draft.mediaType === "video" ? (
                    <video
                      src={draft.mediaUrl}
                      className="h-full w-full object-cover"
                      muted
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={draft.mediaUrl}
                      alt={draft.altText ?? "Draft media"}
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
              ) : null}

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium capitalize">
                    {draft.platform}
                  </p>
                  <span className="text-xs text-slate-500">
                    {formatPostStatus(draft.status)}
                  </span>
                </div>
                <p className="mt-2 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">
                  {draft.hook ? `${draft.hook} — ` : ""}
                  {draft.caption ||
                    (draft.hook
                      ? ""
                      : "(no copy yet — resume to add a caption)")}
                </p>
                {draft.scheduledAt ? (
                  <p className="mt-2 text-xs text-slate-500">
                    Scheduled for{" "}
                    {new Intl.DateTimeFormat("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    }).format(draft.scheduledAt)}
                  </p>
                ) : null}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Link
                    href={`/create?resume=${draft.id}`}
                    className="inline-flex items-center rounded-md border border-slate-200 px-3 py-1 text-xs font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-900"
                  >
                    Resume in studio
                  </Link>
                  <DeleteDraftButton postId={draft.id} />
                </div>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
