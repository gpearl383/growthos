export const SOCIAL_PLATFORMS = ["instagram", "facebook", "tiktok"] as const;

export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];

export function platformLabel(platform: SocialPlatform) {
  const labels: Record<SocialPlatform, string> = {
    instagram: "Instagram",
    facebook: "Facebook",
    tiktok: "TikTok",
  };

  return labels[platform];
}

export type PlatformRule = {
  captionMax: number;
  hashtagMax: number;
  requiresMedia: boolean;
  mediaHint: string;
};

export const PLATFORM_RULES: Record<SocialPlatform, PlatformRule> = {
  instagram: {
    captionMax: 2200,
    hashtagMax: 30,
    requiresMedia: true,
    mediaHint: "Instagram posts need a photo or video to publish.",
  },
  facebook: {
    captionMax: 63206,
    hashtagMax: 30,
    requiresMedia: false,
    mediaHint: "A photo or link preview helps Facebook posts perform better.",
  },
  tiktok: {
    captionMax: 2200,
    hashtagMax: 30,
    requiresMedia: true,
    mediaHint: "TikTok posts need a video to publish.",
  },
};

export function countHashtags(hashtags: string) {
  const matches = hashtags.match(/#[\w-]+/g);
  return matches ? matches.length : 0;
}

export type PostValidation = {
  errors: string[];
  warnings: string[];
  captionCount: number;
  captionMax: number;
  hashtagCount: number;
  hashtagMax: number;
};

export function validatePost(input: {
  platform: SocialPlatform;
  caption: string;
  hashtags: string;
  mediaUrl: string;
  altText?: string;
}): PostValidation {
  const rule = PLATFORM_RULES[input.platform];
  const captionCount = input.caption.trim().length;
  const hashtagCount = countHashtags(input.hashtags);
  const errors: string[] = [];
  const warnings: string[] = [];

  if (captionCount > rule.captionMax) {
    errors.push(
      `Caption is ${captionCount} characters — ${platformLabel(input.platform)} allows up to ${rule.captionMax}.`,
    );
  }

  if (hashtagCount > rule.hashtagMax) {
    errors.push(
      `${hashtagCount} hashtags — ${platformLabel(input.platform)} allows up to ${rule.hashtagMax}.`,
    );
  }

  if (rule.requiresMedia && !input.mediaUrl) {
    errors.push(rule.mediaHint);
  } else if (!rule.requiresMedia && !input.mediaUrl) {
    warnings.push(rule.mediaHint);
  }

  if (input.mediaUrl && !input.altText?.trim()) {
    warnings.push("Add alt text so your media is accessible to everyone.");
  }

  return {
    errors,
    warnings,
    captionCount,
    captionMax: rule.captionMax,
    hashtagCount,
    hashtagMax: rule.hashtagMax,
  };
}
