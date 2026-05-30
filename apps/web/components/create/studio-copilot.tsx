"use client";

import { AiHelperChat, type StudioChatContext } from "@/components/ai-helper/chat";

const STUDIO_STARTERS = [
  "Make the hook stronger",
  "Shorten the caption",
  "Suggest alt text",
  "Give me a TikTok version",
];

type StudioCopilotProps = {
  context: StudioChatContext;
};

export function StudioCopilot({ context }: StudioCopilotProps) {
  return (
    <AiHelperChat
      variant="embedded"
      studioContext={context}
      starters={STUDIO_STARTERS}
      greeting="I can see your current draft. Ask me to refine the hook, caption, hashtags, or alt text for this post."
    />
  );
}
