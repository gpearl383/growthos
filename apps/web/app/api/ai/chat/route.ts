import { createAnthropic } from "@ai-sdk/anthropic";
import { streamText } from "ai";

import {
  buildChatContext,
  buildChatSystemPrompt,
  type StudioContext,
} from "@/lib/ai/chat-context";
import { anthropicConfigured, dbConfigured } from "@/lib/env";
import { getOrCreateTenant } from "@/lib/tenant";

export const maxDuration = 30;

function fallbackReply(message: string, context: Awaited<ReturnType<typeof buildChatContext>>) {
  const normalized = message.toLowerCase();

  if (normalized.includes("post")) {
    return `Try Create & Post to generate something for ${context.businessName}. Focus on your offer: "${context.offerText}". Keep it simple — one photo, one clear next step.`;
  }

  if (normalized.includes("lead")) {
    return `You have ${context.totalLeads} leads total (${context.leadsThisWeek} this week). Check your Leads inbox and call or text new ones quickly — speed matters.`;
  }

  if (normalized.includes("auto") || normalized.includes("reply") || normalized.includes("dm")) {
    return "Turn on auto-replies so INFO and PRICE comments get your link automatically. Go to Auto-Replies and leave the presets on once Instagram is connected.";
  }

  return `Start with one post this week and share your lead page link in your bio. You have ${context.draftCount} saved drafts and ${context.leadsThisWeek} new leads this week.`;
}

export async function POST(request: Request) {
  if (!dbConfigured) {
    return new Response("Database is not configured.", { status: 503 });
  }

  const tenant = await getOrCreateTenant();

  if (!tenant.onboardingComplete) {
    return new Response("Complete onboarding first.", { status: 403 });
  }

  const body = (await request.json()) as {
    messages?: Array<{ role: "user" | "assistant"; content: string }>;
    studioContext?: StudioContext;
  };
  const messages = body.messages ?? [];
  const studioContext = body.studioContext ?? null;
  const lastUserMessage = [...messages]
    .reverse()
    .find((message) => message.role === "user");
  const userText = lastUserMessage?.content ?? "";

  const context = await buildChatContext(tenant);

  if (!anthropicConfigured) {
    const text = fallbackReply(userText, context);
    return new Response(text, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const anthropic = createAnthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  const result = streamText({
    model: anthropic("claude-sonnet-4-20250514"),
    system: buildChatSystemPrompt(context, studioContext),
    messages: messages.map((message) => ({
      role: message.role,
      content: message.content,
    })),
  });

  return result.toTextStreamResponse();
}
