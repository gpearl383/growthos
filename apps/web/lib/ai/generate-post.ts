import { createAnthropic } from "@ai-sdk/anthropic";
import { generateObject } from "ai";
import { z } from "zod";

import { anthropicConfigured } from "@/lib/env";
import type { SocialPlatform } from "@/lib/platforms";

export type PostPlatform = SocialPlatform;

export type GeneratedPostContent = {
  hook: string;
  caption: string;
  hashtags: string;
  facebookCaption: string;
  altText: string;
};

const postOutputSchema = z.object({
  hook: z.string(),
  caption: z.string(),
  hashtags: z.string(),
  facebookCaption: z.string(),
  altText: z.string(),
});

export type GeneratePostInput = {
  businessType?: string | null;
  businessName?: string | null;
  offerText?: string | null;
  goal?: string | null;
  platform: PostPlatform;
  photoDescription?: string;
  mediaUrl?: string | null;
  mediaType?: "image" | "video" | "audio" | null;
};

function goalCTA(goal?: string | null) {
  switch (goal) {
    case "bookings":
      return "book with us";
    case "quotes":
      return "request a free quote";
    case "email_list":
      return "get your free guide";
    case "store_visits":
      return "visit us this week";
    default:
      return "get in touch";
  }
}

function buildFallbackPost(input: GeneratePostInput): GeneratedPostContent {
  const business = input.businessName?.trim() || "Our business";
  const offer = input.offerText?.trim() || "We help local customers every day.";
  const cta = goalCTA(input.goal);
  const photoNote = input.photoDescription
    ? ` ${input.photoDescription.trim()}`
    : "";

  const hook =
    input.platform === "tiktok"
      ? `${business} — watch this.${photoNote}`
      : input.platform === "instagram"
        ? `${business} — ready when you are.${photoNote}`
        : `${business} is here to help.${photoNote}`;

  const caption =
    input.platform === "tiktok"
      ? `${hook}\n\n${offer}\n\nLink in bio to ${cta}. Follow for more local tips.`
      : `${hook}\n\n${offer}\n\nTap the link in our bio to ${cta}. Questions? Send us a message — we reply fast.`;

  const hashtags = [
    "#SmallBusiness",
    "#LocalBusiness",
    "#SupportLocal",
    input.businessType === "salon" ? "#BookNow" : "#GetInTouch",
  ].join(" ");

  const facebookCaption = `${offer} Message us or use our link to ${cta}.`;
  const altText = input.photoDescription?.trim()
    ? input.photoDescription.trim()
    : `Photo for ${business}.`;

  return { hook, caption, hashtags, facebookCaption, altText };
}

async function loadImagePart(mediaUrl: string) {
  try {
    const response = await fetch(mediaUrl);
    if (!response.ok) {
      return null;
    }

    const mimeType = response.headers.get("content-type") ?? "image/jpeg";
    if (!mimeType.startsWith("image/")) {
      return null;
    }

    const image = new Uint8Array(await response.arrayBuffer());
    return { type: "image" as const, image, mediaType: mimeType };
  } catch {
    return null;
  }
}

export async function generatePostContent(
  input: GeneratePostInput,
): Promise<GeneratedPostContent> {
  if (!anthropicConfigured) {
    return buildFallbackPost(input);
  }

  const anthropic = createAnthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  const platformGuidance =
    input.platform === "instagram"
      ? "Write for Instagram: conversational hook, clear CTA, line breaks, no link in caption (say link in bio)."
      : input.platform === "tiktok"
        ? "Write for TikTok: short punchy hook, conversational tone, under 150 words, say link in bio, trending-friendly hashtags."
        : "Write for Facebook: slightly shorter, friendly local business tone.";

  const imagePart =
    input.mediaUrl && input.mediaType !== "video"
      ? await loadImagePart(input.mediaUrl)
      : null;

  const promptText = `Business name: ${input.businessName ?? "Local business"}
Business type: ${input.businessType ?? "general"}
Goal: ${input.goal ?? "get customers"}
Offer: ${input.offerText ?? "Helpful local service"}
Platform: ${input.platform}
Photo context: ${input.photoDescription ?? (imagePart ? "See the attached image." : "General business photo")}

Return JSON with hook, caption, hashtags, facebookCaption (shorter version for Facebook cross-posting), and altText (a concise, factual description of the image for accessibility, max 120 characters).`;

  try {
    const { object } = await generateObject({
      model: anthropic("claude-sonnet-4-20250514"),
      schema: postOutputSchema,
      system: `You write social media posts for small business owners. Use plain language, no marketing jargon, no hype. Align the CTA with the business goal. Never make medical or legal claims.${imagePart ? " Use the attached image to inform the hook, caption, and alt text." : ""} ${platformGuidance}`,
      messages: [
        {
          role: "user",
          content: imagePart
            ? [{ type: "text", text: promptText }, imagePart]
            : [{ type: "text", text: promptText }],
        },
      ],
    });

    return object;
  } catch {
    return buildFallbackPost(input);
  }
}

export function formatPostForCopy(
  post: Omit<GeneratedPostContent, "altText">,
  platform: PostPlatform,
) {
  if (platform === "facebook") {
    return `${post.facebookCaption}\n\n${post.hashtags}`.trim();
  }

  if (platform === "tiktok") {
    return `${post.hook}\n\n${post.caption}\n\n${post.hashtags}`.trim();
  }

  return `${post.caption}\n\n${post.hashtags}`.trim();
}
