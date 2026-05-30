"use client";

import { deleteDraft } from "@/app/actions/posts";

type DeleteDraftButtonProps = {
  postId: string;
};

export function DeleteDraftButton({ postId }: DeleteDraftButtonProps) {
  return (
    <form
      action={deleteDraft}
      onSubmit={(event) => {
        if (
          !window.confirm(
            "Delete this draft? This can't be undone.",
          )
        ) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="postId" value={postId} />
      <button
        type="submit"
        className="inline-flex items-center rounded-md border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 hover:border-red-300 hover:bg-red-50 hover:text-red-700 dark:border-slate-700 dark:text-slate-300 dark:hover:border-red-800 dark:hover:bg-red-950/30 dark:hover:text-red-400"
      >
        Delete
      </button>
    </form>
  );
}
