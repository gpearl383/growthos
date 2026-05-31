"use client";

import { useState } from "react";

import { deleteDraft } from "@/app/actions/posts";

type DeleteDraftButtonProps = {
  postId: string;
};

export function DeleteDraftButton({ postId }: DeleteDraftButtonProps) {
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
          className="inline-flex items-center rounded-md border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900"
        >
          Cancel
        </button>
        <form action={deleteDraft}>
          <input type="hidden" name="postId" value={postId} />
          <button
            type="submit"
            className="inline-flex items-center rounded-md border border-red-300 bg-red-50 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-100 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-950/50"
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
      onClick={() => setConfirming(true)}
      className="inline-flex items-center rounded-md border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 hover:border-red-300 hover:bg-red-50 hover:text-red-700 dark:border-slate-700 dark:text-slate-300 dark:hover:border-red-800 dark:hover:bg-red-950/30 dark:hover:text-red-400"
    >
      Delete
    </button>
  );
}
