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

import { CopyPanel } from "@/components/create/copy-panel";
import { MediaPanel } from "@/components/create/media-panel";
import { PlatformPreview } from "@/components/create/platform-preview";
import { StudioCopilot } from "@/components/create/studio-copilot";
import { StudioTools } from "@/components/create/studio-tools";
import { PLATFORM_LABEL, type StudioAsset } from "@/components/create/studio";
import {
  generatePost,
  saveGeneratedPost,
  scheduleGeneratedPost,
  type PostActionState,
} from "@/app/actions/posts";
import {
  formatPostForCopy,
  type PostPlatform,
} from "@/lib/ai/generate-post";
import type { MediaType } from "@/lib/media/types";
import { validatePost } from "@/lib/platforms";

export type StudioInitialDraft = {
  platform: PostPlatform;
  hook: string;
  caption: string;
  hashtags: string;
  altText: string;
  mediaUrl: string;
  mediaType: MediaType | null;
  audioUrl: string;
};

type PostStudioProps = {
  businessName: string;
  aiConfigured: boolean;
  assets: StudioAsset[];
  connected: Record<PostPlatform, boolean>;
  configured: { openai: boolean; elevenlabs: boolean; canva: boolean };
  initialDraft?: StudioInitialDraft;
};

const initialState: PostActionState = {};

export function PostStudio({
  businessName,
  aiConfigured,
  assets: initialAssets,
  connected,
  configured,
  initialDraft,
}: PostStudioProps) {
  const [platform, setPlatform] = useState<PostPlatform>(
    initialDraft?.platform ?? "instagram",
  );
  const [assets, setAssets] = useState<StudioAsset[]>(initialAssets);
  const [mediaUrl, setMediaUrl] = useState(initialDraft?.mediaUrl ?? "");
  const [mediaType, setMediaType] = useState<MediaType | null>(
    initialDraft?.mediaType ?? null,
  );
  const [hook, setHook] = useState(initialDraft?.hook ?? "");
  const [caption, setCaption] = useState(initialDraft?.caption ?? "");
  const [hashtags, setHashtags] = useState(initialDraft?.hashtags ?? "");
  const [altText, setAltText] = useState(initialDraft?.altText ?? "");
  const [audioUrl, setAudioUrl] = useState(initialDraft?.audioUrl ?? "");
  const [photoDescription, setPhotoDescription] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [deletingUrl, setDeletingUrl] = useState<string | null>(null);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);

  const [state, generateAction, generating] = useActionState(
    generatePost,
    initialState,
  );

  const minScheduleValue = new Date(Date.now() + 5 * 60 * 1000)
    .toISOString()
    .slice(0, 16);

  useEffect(() => {
    if (!state.generated) {
      return;
    }

    setHook(state.generated.hook);
    setCaption(state.generated.caption);
    setHashtags(state.generated.hashtags);
    setAltText(state.generated.altText);
    setPlatform(state.generated.platform);
    setCopyMessage(null);
  }, [state.generated]);

  async function handleUpload(file: File) {
    setUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/media/upload", {
        method: "POST",
        body: formData,
      });

      const data = (await response.json()) as {
        asset?: StudioAsset;
        error?: string;
      };

      if (!response.ok || !data.asset) {
        throw new Error(data.error ?? "Upload failed.");
      }

      const asset = data.asset;
      setAssets((prev) => [asset, ...prev]);
      setMediaUrl(asset.url);
      setMediaType(asset.type);
      if (asset.altText && !altText) {
        setAltText(asset.altText);
      }
    } catch (error) {
      setUploadError(
        error instanceof Error ? error.message : "Upload failed.",
      );
    } finally {
      setUploading(false);
    }
  }

  function handleSelect(asset: StudioAsset) {
    setMediaUrl(asset.url);
    setMediaType(asset.type);
    if (asset.altText && !altText) {
      setAltText(asset.altText);
    }
  }

  async function handleDelete(asset: StudioAsset) {
    if (!asset.id || deletingUrl) {
      return;
    }

    setDeletingUrl(asset.url);
    setUploadError(null);

    try {
      const response = await fetch("/api/media/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: asset.id }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(data.error ?? "Could not delete media.");
      }

      setAssets((prev) => prev.filter((item) => item.url !== asset.url));
      if (mediaUrl === asset.url) {
        setMediaUrl("");
        setMediaType(null);
      }
    } catch (error) {
      setUploadError(
        error instanceof Error ? error.message : "Could not delete media.",
      );
    } finally {
      setDeletingUrl(null);
    }
  }

  function handleImageGenerated(asset: StudioAsset) {
    setAssets((prev) => [asset, ...prev]);
    setMediaUrl(asset.url);
    setMediaType(asset.type);
    if (asset.altText && !altText) {
      setAltText(asset.altText);
    }
  }

  function handleVoiceover(asset: StudioAsset) {
    setAssets((prev) => [asset, ...prev]);
    setAudioUrl(asset.url);
  }

  function handleCopyChange(
    field: "platform" | "hook" | "caption" | "hashtags" | "altText",
    value: string,
  ) {
    switch (field) {
      case "platform":
        setPlatform(value as PostPlatform);
        break;
      case "hook":
        setHook(value);
        break;
      case "caption":
        setCaption(value);
        break;
      case "hashtags":
        setHashtags(value);
        break;
      case "altText":
        setAltText(value);
        break;
    }
  }

  async function handleCopy() {
    const text = formatPostForCopy(
      { hook, caption, hashtags, facebookCaption: caption },
      platform,
    );

    await navigator.clipboard.writeText(text);
    setCopyMessage(
      platform === "tiktok"
        ? "Copied! Open TikTok, upload your video, and paste the caption."
        : "Copied! Open the app and paste your post.",
    );
  }

  const platformConnected = connected[platform];
  // A draft is saveable as soon as the user has *anything* worth coming back
  // to — media, a hook, a caption, or hashtags. We keep scheduling stricter
  // (caption + scheduledAt) since that's an actual publish.
  const canSave =
    caption.trim().length > 0 ||
    hook.trim().length > 0 ||
    hashtags.trim().length > 0 ||
    mediaUrl.length > 0;
  const canSchedule = caption.trim().length > 0;
  const validation = validatePost({
    platform,
    caption,
    hashtags,
    mediaUrl,
    altText,
  });
  const hasBlockingErrors = validation.errors.length > 0;

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <MediaPanel
          assets={assets}
          selectedUrl={mediaUrl}
          uploading={uploading}
          error={uploadError}
          deletingUrl={deletingUrl}
          onSelect={handleSelect}
          onUpload={handleUpload}
          onDelete={handleDelete}
        />

        <CopyPanel
          platform={platform}
          hook={hook}
          caption={caption}
          hashtags={hashtags}
          altText={altText}
          onChange={handleCopyChange}
        />

        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
            <CardDescription>
              {aiConfigured
                ? "Generate copy from your media, then save, copy, or schedule."
                : "Add ANTHROPIC_API_KEY for AI copy — you can still write and schedule manually."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form action={generateAction} className="space-y-3">
              <input type="hidden" name="platform" value={platform} />
              <input type="hidden" name="mediaUrl" value={mediaUrl} />
              <input type="hidden" name="mediaType" value={mediaType ?? ""} />
              <div className="space-y-1.5">
                <label className="text-sm font-medium">
                  Optional: describe the photo or post idea
                </label>
                <input
                  name="photoDescription"
                  value={photoDescription}
                  onChange={(event) => setPhotoDescription(event.target.value)}
                  placeholder="e.g. before/after of a kitchen remodel"
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                />
              </div>
              {state.error ? (
                <p className="text-sm text-red-600 dark:text-red-400">
                  {state.error}
                </p>
              ) : null}
              <Button type="submit" disabled={generating}>
                {generating ? "Generating…" : "Generate copy with AI"}
              </Button>
            </form>

            <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
              <form action={saveGeneratedPost}>
                <input type="hidden" name="platform" value={platform} />
                <input type="hidden" name="hook" value={hook} />
                <input type="hidden" name="caption" value={caption} />
                <input type="hidden" name="hashtags" value={hashtags} />
                <input type="hidden" name="altText" value={altText} />
                <input type="hidden" name="mediaUrl" value={mediaUrl} />
                <input type="hidden" name="mediaType" value={mediaType ?? ""} />
                <input type="hidden" name="audioUrl" value={audioUrl} />
                <Button type="submit" variant="secondary" disabled={!canSave}>
                  Save draft
                </Button>
              </form>

              <Button
                type="button"
                variant="outline"
                onClick={handleCopy}
                disabled={!canSchedule}
              >
                Copy post
              </Button>

              {!canSave ? (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Add a caption, hook, hashtags, or upload media to save a
                  draft.
                </p>
              ) : null}
            </div>

            {copyMessage ? (
              <p className="text-sm text-emerald-600 dark:text-emerald-400">
                {copyMessage}
              </p>
            ) : null}

            {canSave && (validation.errors.length > 0 || validation.warnings.length > 0) ? (
              <ul className="space-y-1 border-t border-slate-100 pt-4 text-xs dark:border-slate-800">
                {validation.errors.map((message) => (
                  <li key={message} className="text-red-600 dark:text-red-400">
                    ✗ {message}
                  </li>
                ))}
                {validation.warnings.map((message) => (
                  <li
                    key={message}
                    className="text-amber-600 dark:text-amber-400"
                  >
                    ⚠ {message}
                  </li>
                ))}
              </ul>
            ) : null}

            <form
              action={scheduleGeneratedPost}
              className="space-y-3 border-t border-slate-100 pt-4 dark:border-slate-800"
            >
              <input type="hidden" name="platform" value={platform} />
              <input type="hidden" name="hook" value={hook} />
              <input type="hidden" name="caption" value={caption} />
              <input type="hidden" name="hashtags" value={hashtags} />
              <input type="hidden" name="altText" value={altText} />
              <input type="hidden" name="mediaUrl" value={mediaUrl} />
              <input type="hidden" name="mediaType" value={mediaType ?? ""} />
              <input type="hidden" name="audioUrl" value={audioUrl} />
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Schedule for later</label>
                <input
                  type="datetime-local"
                  name="scheduledAt"
                  value={scheduledAt}
                  min={minScheduleValue}
                  onChange={(event) => setScheduledAt(event.target.value)}
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                />
              </div>
              {!platformConnected ? (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  {PLATFORM_LABEL[platform]} isn&apos;t connected yet. Scheduled
                  posts publish automatically once you connect it in Settings.
                </p>
              ) : null}
              <Button
                type="submit"
                variant="secondary"
                disabled={!canSchedule || !scheduledAt || hasBlockingErrors}
              >
                Schedule post
              </Button>
              {!canSchedule ? (
                <p className="text-xs text-slate-500">
                  Add a caption first — scheduled posts can&apos;t publish
                  empty.
                </p>
              ) : hasBlockingErrors ? (
                <p className="text-xs text-slate-500">
                  Fix the issues above before scheduling.
                </p>
              ) : null}
            </form>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <PlatformPreview
          platform={platform}
          businessName={businessName}
          mediaUrl={mediaUrl}
          mediaType={mediaType}
          hook={hook}
          caption={caption}
          hashtags={hashtags}
        />
        <StudioTools
          platform={platform}
          voiceoverText={[hook, caption].filter(Boolean).join(". ")}
          audioUrl={audioUrl}
          configured={configured}
          onImageGenerated={handleImageGenerated}
          onVoiceover={handleVoiceover}
        />
        <StudioCopilot
          context={{ platform, hook, caption, hashtags, altText, mediaUrl }}
        />
      </div>
    </div>
  );
}
