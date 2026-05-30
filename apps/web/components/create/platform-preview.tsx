"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@growthos/ui/card";

import {
  PLATFORM_ASPECT,
  PLATFORM_LABEL,
} from "@/components/create/studio";
import type { PostPlatform } from "@/lib/ai/generate-post";
import type { MediaType } from "@/lib/media/types";

type PlatformPreviewProps = {
  platform: PostPlatform;
  businessName: string;
  mediaUrl: string;
  mediaType: MediaType | null;
  hook: string;
  caption: string;
  hashtags: string;
};

export function PlatformPreview({
  platform,
  businessName,
  mediaUrl,
  mediaType,
  hook,
  caption,
  hashtags,
}: PlatformPreviewProps) {
  const aspect = PLATFORM_ASPECT[platform];
  const captionPreview = [hook, caption].filter(Boolean).join("\n\n");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {PLATFORM_LABEL[platform]} preview
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mx-auto max-w-xs overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2 border-b border-slate-100 p-3 dark:border-slate-800">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600" />
            <span className="text-sm font-medium">{businessName}</span>
          </div>

          <div className={`w-full bg-slate-100 dark:bg-slate-900 ${aspect}`}>
            {mediaUrl ? (
              mediaType === "video" ? (
                <video
                  src={mediaUrl}
                  className="h-full w-full object-cover"
                  controls
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={mediaUrl}
                  alt="Post media preview"
                  className="h-full w-full object-cover"
                />
              )
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-slate-400">
                Media preview
              </div>
            )}
          </div>

          <div className="space-y-2 p-3">
            <p className="whitespace-pre-line text-sm text-slate-700 dark:text-slate-200">
              {captionPreview || "Your caption will appear here."}
            </p>
            {hashtags ? (
              <p className="text-xs text-emerald-600 dark:text-emerald-400">
                {hashtags}
              </p>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
