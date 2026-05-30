"use client";

import { useRef, useState } from "react";
import { Button } from "@growthos/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@growthos/ui/card";

import type { StudioAsset } from "@/components/create/studio";

const SKIP_CONFIRM_KEY = "growthos:skipMediaDeleteConfirm";

type MediaPanelProps = {
  assets: StudioAsset[];
  selectedUrl: string;
  uploading: boolean;
  error?: string | null;
  deletingUrl?: string | null;
  onSelect: (asset: StudioAsset) => void;
  onUpload: (file: File) => void;
  onDelete: (asset: StudioAsset) => void;
};

export function MediaPanel({
  assets,
  selectedUrl,
  uploading,
  error,
  deletingUrl,
  onSelect,
  onUpload,
  onDelete,
}: MediaPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [confirmAsset, setConfirmAsset] = useState<StudioAsset | null>(null);
  const [dontAskAgain, setDontAskAgain] = useState(false);

  function shouldSkipConfirm() {
    if (typeof window === "undefined") {
      return false;
    }
    return window.localStorage.getItem(SKIP_CONFIRM_KEY) === "true";
  }

  function requestDelete(asset: StudioAsset) {
    if (shouldSkipConfirm()) {
      onDelete(asset);
      return;
    }
    setDontAskAgain(false);
    setConfirmAsset(asset);
  }

  function confirmDelete() {
    if (!confirmAsset) {
      return;
    }
    if (dontAskAgain && typeof window !== "undefined") {
      window.localStorage.setItem(SKIP_CONFIRM_KEY, "true");
    }
    onDelete(confirmAsset);
    setConfirmAsset(null);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Media</CardTitle>
        <CardDescription>
          Upload a photo or video, or pick from your library. Selected media is
          used for the post and AI suggestions.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={inputRef}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                onUpload(file);
              }
              event.target.value = "";
            }}
          />
          <Button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? "Uploading…" : "Upload media"}
          </Button>
          <p className="text-xs text-slate-500">
            Images and videos up to ~30MB. Stored locally for this POC.
          </p>
        </div>

        {error ? (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        ) : null}

        {assets.length > 0 ? (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {assets.map((asset) => {
              const selected = asset.url === selectedUrl;
              const deleting = deletingUrl === asset.url;
              const canDelete = Boolean(asset.id);
              return (
                <div
                  key={asset.url}
                  className={`group relative overflow-hidden rounded-md border-2 transition-colors ${
                    selected
                      ? "border-emerald-500"
                      : "border-transparent hover:border-slate-300 dark:hover:border-slate-700"
                  } ${deleting ? "opacity-50" : ""}`}
                >
                  <button
                    type="button"
                    onClick={() => onSelect(asset)}
                    disabled={deleting}
                    className="block w-full"
                    aria-label="Select media"
                  >
                    {asset.type === "video" ? (
                      <video
                        src={asset.url}
                        className="h-20 w-full object-cover"
                        muted
                      />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={asset.url}
                        alt={asset.altText ?? "Media asset"}
                        className="h-20 w-full object-cover"
                      />
                    )}
                  </button>

                  {asset.type === "video" ? (
                    <span className="pointer-events-none absolute bottom-1 left-1 rounded bg-black/60 px-1 text-[10px] text-white">
                      Video
                    </span>
                  ) : null}

                  {canDelete ? (
                    <button
                      type="button"
                      onClick={() => requestDelete(asset)}
                      disabled={deleting}
                      aria-label="Delete media"
                      title="Delete media"
                      className="absolute bottom-1 right-1 rounded-md bg-black/55 p-1 text-white opacity-0 transition-opacity hover:bg-red-600 focus:opacity-100 group-hover:opacity-100 disabled:cursor-not-allowed"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M3 6h18" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                        <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        <line x1="10" y1="11" x2="10" y2="17" />
                        <line x1="14" y1="11" x2="14" y2="17" />
                      </svg>
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="rounded-md border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700">
            No media yet. Upload a photo or video to get started.
          </p>
        )}
      </CardContent>

      {confirmAsset ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-media-title"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setConfirmAsset(null);
            }
          }}
        >
          <div className="w-full max-w-sm rounded-lg bg-white p-5 shadow-xl dark:bg-slate-900">
            <h2
              id="delete-media-title"
              className="text-base font-semibold text-slate-900 dark:text-slate-100"
            >
              Delete this media?
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              This permanently removes the file from your library. This can&apos;t
              be undone.
            </p>

            <label className="mt-4 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <input
                type="checkbox"
                checked={dontAskAgain}
                onChange={(event) => setDontAskAgain(event.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              Don&apos;t ask again
            </label>

            <div className="mt-5 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setConfirmAsset(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={confirmDelete}
                className="bg-red-600 text-white hover:bg-red-700"
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </Card>
  );
}
