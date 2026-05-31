"use client";

import { useState } from "react";

import { removeLead } from "@/app/actions/leads";

type DeleteLeadButtonProps = {
  leadId: string;
  leadName: string;
};

export function DeleteLeadButton({ leadId, leadName }: DeleteLeadButtonProps) {
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <div className="inline-flex items-center gap-2">
        <span className="text-xs text-slate-600 dark:text-slate-300">
          Are you sure?
        </span>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="inline-flex h-9 items-center justify-center rounded-md border border-slate-200 px-3 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900"
        >
          Cancel
        </button>
        <form action={removeLead}>
          <input type="hidden" name="leadId" value={leadId} />
          <button
            type="submit"
            aria-label={`Confirm delete ${leadName}`}
            className="inline-flex h-9 items-center justify-center rounded-md border border-red-300 bg-red-50 px-3 text-sm font-medium text-red-700 hover:bg-red-100 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-950/50"
          >
            Delete
          </button>
        </form>
      </div>
    );
  }

  return (
    <button
      type="button"
      aria-label={`Delete ${leadName}`}
      title="Delete lead"
      onClick={() => setConfirming(true)}
      className="inline-flex h-9 items-center justify-center rounded-md border border-slate-200 px-3 text-sm font-medium text-slate-600 hover:border-red-300 hover:bg-red-50 hover:text-red-700 dark:border-slate-700 dark:text-slate-300 dark:hover:border-red-800 dark:hover:bg-red-950/30 dark:hover:text-red-400"
    >
      Delete
    </button>
  );
}
