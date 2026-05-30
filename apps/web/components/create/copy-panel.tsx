"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@growthos/ui/card";

import { PLATFORM_LABEL } from "@/components/create/studio";
import type { PostPlatform } from "@/lib/ai/generate-post";
import {
  countHashtags,
  PLATFORM_RULES,
  SOCIAL_PLATFORMS,
} from "@/lib/platforms";

type CopyPanelProps = {
  platform: PostPlatform;
  hook: string;
  caption: string;
  hashtags: string;
  altText: string;
  onChange: (
    field: "platform" | "hook" | "caption" | "hashtags" | "altText",
    value: string,
  ) => void;
};

const fieldClass =
  "w-full rounded-md border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900";

export function CopyPanel({
  platform,
  hook,
  caption,
  hashtags,
  altText,
  onChange,
}: CopyPanelProps) {
  const rule = PLATFORM_RULES[platform];
  const captionCount = caption.trim().length;
  const hashtagCount = countHashtags(hashtags);
  const captionOver = captionCount > rule.captionMax;
  const hashtagsOver = hashtagCount > rule.hashtagMax;
  const counterClass = (over: boolean) =>
    over
      ? "text-xs font-medium text-red-600 dark:text-red-400"
      : "text-xs text-slate-400";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Copy</CardTitle>
        <CardDescription>
          Edit the hook, caption, hashtags, and alt text. Generate with AI or
          write your own.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Platform</label>
          <select
            value={platform}
            onChange={(event) => onChange("platform", event.target.value)}
            className={fieldClass}
          >
            {SOCIAL_PLATFORMS.map((value) => (
              <option key={value} value={value}>
                {PLATFORM_LABEL[value]}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Hook</label>
          <input
            value={hook}
            onChange={(event) => onChange("hook", event.target.value)}
            placeholder="Attention-grabbing first line"
            className={fieldClass}
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Caption</label>
            <span className={counterClass(captionOver)}>
              {captionCount} / {rule.captionMax}
            </span>
          </div>
          <textarea
            value={caption}
            onChange={(event) => onChange("caption", event.target.value)}
            placeholder="Write your caption…"
            rows={6}
            className={fieldClass}
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Hashtags</label>
            <span className={counterClass(hashtagsOver)}>
              {hashtagCount} / {rule.hashtagMax} tags
            </span>
          </div>
          <input
            value={hashtags}
            onChange={(event) => onChange("hashtags", event.target.value)}
            placeholder="#localbusiness #yourcity"
            className={fieldClass}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">
            Alt text{" "}
            <span className="font-normal text-slate-500">
              (image description for accessibility)
            </span>
          </label>
          <textarea
            value={altText}
            onChange={(event) => onChange("altText", event.target.value)}
            placeholder="Describe the image for screen readers"
            rows={2}
            className={fieldClass}
          />
        </div>
      </CardContent>
    </Card>
  );
}
