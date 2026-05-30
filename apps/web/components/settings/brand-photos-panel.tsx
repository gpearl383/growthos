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
  addBrandPhoto,
  removeBrandPhoto,
  type BrandActionState,
} from "@/app/actions/brand";

type BrandPhotosPanelProps = {
  photos: string[];
  maxPhotos: number;
};

const initialState: BrandActionState = {};

function looksLikeUrl(value: string) {
  return /^https?:\/\/\S+/i.test(value.trim());
}

export function BrandPhotosPanel({
  photos,
  maxPhotos,
}: BrandPhotosPanelProps) {
  const [state, formAction, pending] = useActionState(
    addBrandPhoto,
    initialState,
  );
  const [url, setUrl] = useState("");
  const [previewError, setPreviewError] = useState(false);

  useEffect(() => {
    if (state.success) {
      setUrl("");
      setPreviewError(false);
    }
  }, [state.success]);

  const showPreview = looksLikeUrl(url) && !previewError;
  const atLimit = photos.length >= maxPhotos;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Brand photos</CardTitle>
        <CardDescription>
          Add image URLs you want available in the Post Studio. These are public
          links (not uploaded files) and show up in the Media picker on Create.
          Up to {maxPhotos} photos.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {photos.length > 0 ? (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {photos.map((photo) => (
              <div
                key={photo}
                className="group relative overflow-hidden rounded-md border border-slate-200 dark:border-slate-700"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo}
                  alt="Brand photo"
                  className="h-24 w-full bg-slate-100 object-cover dark:bg-slate-800"
                />
                <form action={removeBrandPhoto}>
                  <input type="hidden" name="url" value={photo} />
                  <button
                    type="submit"
                    aria-label="Remove brand photo"
                    title="Remove brand photo"
                    className="absolute bottom-1 right-1 rounded-md bg-black/55 p-1 text-white opacity-0 transition-opacity hover:bg-red-600 focus:opacity-100 group-hover:opacity-100"
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
                </form>
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-md border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700">
            No brand photos yet. Add an image URL below.
          </p>
        )}

        {!atLimit ? (
          <form action={formAction} className="space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
              <div className="flex-1 space-y-1.5">
                <label className="text-sm font-medium" htmlFor="brand-photo-url">
                  Image URL
                </label>
                <input
                  id="brand-photo-url"
                  name="url"
                  value={url}
                  onChange={(event) => {
                    setUrl(event.target.value);
                    setPreviewError(false);
                  }}
                  placeholder="https://images.example.com/photo.jpg"
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                />
              </div>
              <Button type="submit" disabled={pending} className="sm:mt-6">
                {pending ? "Adding…" : "Add photo"}
              </Button>
            </div>

            {showPreview ? (
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500">Preview:</span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url.trim()}
                  alt="Brand photo preview"
                  className="h-16 w-16 rounded-md border border-slate-200 object-cover dark:border-slate-700"
                  onError={() => setPreviewError(true)}
                />
              </div>
            ) : null}

            {previewError && looksLikeUrl(url) ? (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                That URL didn&apos;t load as an image. Double-check it&apos;s a
                direct, public image link.
              </p>
            ) : null}

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
        ) : (
          <p className="text-sm text-slate-500">
            You&apos;ve reached the {maxPhotos}-photo limit. Remove one to add
            another.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
