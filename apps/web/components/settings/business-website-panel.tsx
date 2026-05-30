"use client";

import { useActionState, useEffect, useState } from "react";
import { Button } from "@growthos/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@growthos/ui/card";

import {
  updateBusinessWebsite,
  type WebsiteActionState,
} from "@/app/actions/brand";

type BusinessWebsitePanelProps = {
  websiteUrl: string | null;
};

const initialState: WebsiteActionState = {};

function looksLikeUrl(value: string) {
  return value.trim().length === 0 || /^https?:\/\/\S+\.\S+/i.test(value.trim());
}

export function BusinessWebsitePanel({ websiteUrl }: BusinessWebsitePanelProps) {
  const [state, formAction, pending] = useActionState(
    updateBusinessWebsite,
    initialState,
  );
  const [value, setValue] = useState(websiteUrl ?? "");

  useEffect(() => {
    if (typeof state.websiteUrl !== "undefined") {
      setValue(state.websiteUrl ?? "");
    }
  }, [state.websiteUrl]);

  const trimmed = value.trim();
  const valid = looksLikeUrl(value);
  const persisted = websiteUrl ?? "";
  const dirty = trimmed !== persisted.trim();
  const canClear = persisted.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Business website</CardTitle>
        <CardDescription>
          This shows as a &ldquo;visit our website&rdquo; link on your public lead
          page and is used as context for the AI copilot.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form action={formAction} className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="website-url">
              Website URL
            </label>
            <input
              id="website-url"
              name="websiteUrl"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              inputMode="url"
              autoComplete="url"
              placeholder="https://yourbusiness.com"
              className={`w-full rounded-md border px-3 py-2 text-sm dark:bg-slate-900 ${
                valid
                  ? "border-slate-200 dark:border-slate-700"
                  : "border-red-400 dark:border-red-700"
              }`}
            />
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Leave blank to remove the link from your lead page.
            </p>
            {!valid ? (
              <p className="text-xs text-red-600 dark:text-red-400">
                Use a full URL starting with http:// or https://
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={pending || !valid || !dirty}>
              {pending ? "Saving…" : "Save"}
            </Button>
            {persisted ? (
              <a
                href={persisted}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium text-emerald-700 underline-offset-2 hover:underline dark:text-emerald-400"
              >
                Open current site
              </a>
            ) : null}
            {canClear && trimmed.length > 0 && trimmed === persisted.trim() ? (
              <button
                type="button"
                onClick={() => setValue("")}
                className="text-xs text-slate-500 underline-offset-2 hover:underline dark:text-slate-400"
              >
                Clear
              </button>
            ) : null}
          </div>

          {state.error ? (
            <p className="text-sm text-red-600 dark:text-red-400">
              {state.error}
            </p>
          ) : null}
          {state.success ? (
            <p className="text-sm text-emerald-600 dark:text-emerald-400">
              {state.success}
            </p>
          ) : null}
        </form>
      </CardContent>
    </Card>
  );
}
