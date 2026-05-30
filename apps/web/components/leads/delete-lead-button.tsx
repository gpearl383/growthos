"use client";

import { removeLead } from "@/app/actions/leads";

type DeleteLeadButtonProps = {
  leadId: string;
  leadName: string;
};

export function DeleteLeadButton({ leadId, leadName }: DeleteLeadButtonProps) {
  return (
    <form
      action={removeLead}
      onSubmit={(event) => {
        if (
          !window.confirm(
            `Delete ${leadName}? This can't be undone. Linked analytics events stay but are unlinked from this lead.`,
          )
        ) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="leadId" value={leadId} />
      <button
        type="submit"
        aria-label={`Delete ${leadName}`}
        title="Delete lead"
        className="inline-flex h-9 items-center justify-center rounded-md border border-slate-200 px-3 text-sm font-medium text-slate-600 hover:border-red-300 hover:bg-red-50 hover:text-red-700 dark:border-slate-700 dark:text-slate-300 dark:hover:border-red-800 dark:hover:bg-red-950/30 dark:hover:text-red-400"
      >
        Delete
      </button>
    </form>
  );
}
