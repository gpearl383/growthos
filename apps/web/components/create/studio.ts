import type { PostPlatform } from "@/lib/ai/generate-post";
import type { MediaType } from "@/lib/media/types";

export type StudioAsset = {
  id?: string;
  url: string;
  type: MediaType;
  altText?: string | null;
  source: string;
};

export const PLATFORM_ASPECT: Record<PostPlatform, string> = {
  instagram: "aspect-square",
  facebook: "aspect-[4/5]",
  tiktok: "aspect-[9/16]",
};

export const PLATFORM_LABEL: Record<PostPlatform, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  tiktok: "TikTok",
};
