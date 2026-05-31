"use client";

import { useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Button } from "@growthos/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@growthos/ui/card";

export type StudioChatContext = {
  platform: string;
  hook: string;
  caption: string;
  hashtags: string;
  altText: string;
  mediaUrl: string;
};

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type AiHelperChatProps = {
  variant?: "floating" | "embedded";
  studioContext?: StudioChatContext;
  starters?: string[];
  greeting?: string;
};

const DEFAULT_STARTERS = [
  "What should I post this week?",
  "How do I get more bookings?",
  "Should I turn on auto-replies?",
];

export function AiHelperChat({
  variant = "floating",
  studioContext,
  starters = DEFAULT_STARTERS,
  greeting = "Hi! I can help you decide what to post, how to get more leads, and what to turn on next.",
}: AiHelperChatProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(variant === "embedded");
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: greeting },
  ]);
  // Ref keeps sendMessage from reading a stale closure value when state updates
  // haven't flushed yet (e.g. a starter button clicked right after a reply lands).
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  // The /create page renders its own embedded copilot, so suppress the FAB there.
  if (variant === "floating" && pathname?.startsWith("/create")) {
    return null;
  }

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || pending) {
      return;
    }

    const nextMessages: ChatMessage[] = [
      ...messagesRef.current,
      { role: "user", content: trimmed },
    ];
    setMessages(nextMessages);
    setInput("");
    setPending(true);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages.map((message) => ({
            role: message.role,
            content: message.content,
          })),
          studioContext,
        }),
      });

      if (!response.ok) {
        throw new Error("Chat request failed");
      }

      const assistantText = await response.text();

      setMessages([
        ...nextMessages,
        {
          role: "assistant",
          content: assistantText || "I couldn't generate a reply.",
        },
      ]);
    } catch {
      setMessages([
        ...nextMessages,
        {
          role: "assistant",
          content: "Something went wrong. Try again in a moment.",
        },
      ]);
    } finally {
      setPending(false);
    }
  }

  const conversation = (
    <CardContent className="space-y-4">
      <div
        className={`space-y-3 overflow-y-auto pr-1 ${
          variant === "embedded" ? "max-h-96" : "max-h-72"
        }`}
      >
        {messages.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            className={`rounded-md px-3 py-2 text-sm ${
              message.role === "user"
                ? "ml-8 bg-emerald-600 text-white"
                : "mr-8 bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100"
            }`}
          >
            {message.content}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {starters.map((starter) => (
          <button
            key={starter}
            type="button"
            onClick={() => sendMessage(starter)}
            className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900"
          >
            {starter}
          </button>
        ))}
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void sendMessage(input);
        }}
        className="flex gap-2"
      >
        <label htmlFor="chat-input" className="sr-only">Message</label>
        <input
          id="chat-input"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ask anything…"
          className="flex-1 rounded-md border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
        />
        <Button type="submit" disabled={pending}>
          {pending ? "…" : "Send"}
        </Button>
      </form>
    </CardContent>
  );

  if (variant === "embedded") {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">AI copilot</CardTitle>
          <CardDescription>
            Ask for hook ideas, hashtag tweaks, or alt text for this post.
          </CardDescription>
        </CardHeader>
        {conversation}
      </Card>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {open ? (
        <Card className="w-[min(100vw-2rem,24rem)] shadow-xl">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="text-base">GrowthOS helper</CardTitle>
                <CardDescription>Plain-English marketing help</CardDescription>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-sm text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              >
                Close
              </button>
            </div>
          </CardHeader>
          {conversation}
        </Card>
      ) : (
        <Button onClick={() => setOpen(true)} className="shadow-lg">
          Ask GrowthOS
        </Button>
      )}
    </div>
  );
}
