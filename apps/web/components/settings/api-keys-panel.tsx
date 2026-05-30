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
  type ApiKeyActionState,
  deleteApiKey,
  saveApiKey,
} from "@/app/actions/api-keys";

export type ProviderStatusView = {
  provider: string;
  label: string;
  helpText: string;
  docsUrl: string;
  placeholder: string;
  configured: boolean;
  source: "tenant" | "env" | "none";
  last4: string | null;
  envFallback: boolean;
};

type ApiKeysPanelProps = {
  statuses: ProviderStatusView[];
};

const initialState: ApiKeyActionState = {};

function StatusBadge({ status }: { status: ProviderStatusView }) {
  if (status.source === "tenant") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
        Saved · ••••{status.last4 ?? ""}
      </span>
    );
  }

  if (status.source === "env") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-medium text-sky-700 dark:bg-sky-900/40 dark:text-sky-300">
        Using server env var
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
      Not set
    </span>
  );
}

function ProviderRow({ status }: { status: ProviderStatusView }) {
  const [state, formAction, pending] = useActionState(saveApiKey, initialState);
  const [value, setValue] = useState("");

  useEffect(() => {
    if (state.success) {
      setValue("");
    }
  }, [state.success]);

  return (
    <div className="space-y-3 rounded-lg border border-slate-200 p-4 dark:border-slate-800">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold">{status.label}</h3>
            <StatusBadge status={status} />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {status.helpText}{" "}
            <a
              href={status.docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-emerald-700 underline-offset-2 hover:underline dark:text-emerald-400"
            >
              Get a key
            </a>
          </p>
        </div>

        {status.source === "tenant" ? (
          <form action={deleteApiKey}>
            <input type="hidden" name="provider" value={status.provider} />
            <Button type="submit" variant="outline" size="sm">
              Remove
            </Button>
          </form>
        ) : null}
      </div>

      <form action={formAction} className="space-y-2">
        <input type="hidden" name="provider" value={status.provider} />
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            type="password"
            name="value"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder={status.placeholder}
            autoComplete="off"
            spellCheck={false}
            className="w-full rounded-md border border-slate-200 px-3 py-2 font-mono text-sm dark:border-slate-700 dark:bg-slate-900"
          />
          <Button type="submit" disabled={pending || value.trim().length === 0}>
            {pending
              ? "Saving…"
              : status.source === "tenant"
                ? "Replace key"
                : "Save key"}
          </Button>
        </div>

        {status.source === "tenant" && status.envFallback ? (
          <p className="text-xs text-slate-400">
            Removing your saved key falls back to the server environment
            variable.
          </p>
        ) : null}

        {state.error ? (
          <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>
        ) : null}
        {state.success ? (
          <p className="text-sm text-emerald-600 dark:text-emerald-400">
            {state.success}
          </p>
        ) : null}
      </form>
    </div>
  );
}

export function ApiKeysPanel({ statuses }: ApiKeysPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>API keys</CardTitle>
        <CardDescription>
          Add your own provider keys to turn on AI features. Keys are encrypted
          and stored securely — they&apos;re never shown again after you save
          them.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {statuses.map((status) => (
          <ProviderRow key={status.provider} status={status} />
        ))}
      </CardContent>
    </Card>
  );
}
