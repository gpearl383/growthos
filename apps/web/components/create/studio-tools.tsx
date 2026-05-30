"use client";

import { useState } from "react";
import { Button } from "@growthos/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@growthos/ui/card";

import type { StudioAsset } from "@/components/create/studio";
import type { PostPlatform } from "@/lib/ai/generate-post";

type StudioToolsProps = {
  platform: PostPlatform;
  voiceoverText: string;
  audioUrl: string;
  configured: { openai: boolean; elevenlabs: boolean; canva: boolean };
  onImageGenerated: (asset: StudioAsset) => void;
  onVoiceover: (asset: StudioAsset) => void;
};

export function StudioTools({
  platform,
  voiceoverText,
  audioUrl,
  configured,
  onImageGenerated,
  onVoiceover,
}: StudioToolsProps) {
  const [imagePrompt, setImagePrompt] = useState("");
  const [busy, setBusy] = useState<"image" | "audio" | "canva" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerateImage() {
    if (!imagePrompt.trim()) {
      setError("Describe the image you want to generate.");
      return;
    }
    setBusy("image");
    setError(null);
    try {
      const response = await fetch("/api/ai/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: imagePrompt }),
      });
      const data = (await response.json()) as {
        asset?: StudioAsset;
        error?: string;
      };
      if (!response.ok || !data.asset) {
        throw new Error(data.error ?? "Image generation failed.");
      }
      onImageGenerated(data.asset);
      setImagePrompt("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Image failed.");
    } finally {
      setBusy(null);
    }
  }

  async function handleVoiceover() {
    if (!voiceoverText.trim()) {
      setError("Write a hook or caption before adding a voiceover.");
      return;
    }
    setBusy("audio");
    setError(null);
    try {
      const response = await fetch("/api/audio/generate-voiceover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: voiceoverText }),
      });
      const data = (await response.json()) as {
        asset?: StudioAsset;
        error?: string;
      };
      if (!response.ok || !data.asset) {
        throw new Error(data.error ?? "Voiceover failed.");
      }
      onVoiceover(data.asset);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Voiceover failed.");
    } finally {
      setBusy(null);
    }
  }

  async function handleEditInCanva() {
    setBusy("canva");
    setError(null);
    try {
      const response = await fetch("/api/canva/designs/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform }),
      });

      if (response.status === 401) {
        window.location.href = "/api/canva/oauth/start";
        return;
      }

      const data = (await response.json()) as {
        editUrl?: string | null;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Could not open Canva.");
      }

      if (data.editUrl) {
        window.open(data.editUrl, "_blank", "noopener");
      } else {
        setError("Canva did not return an editor link.");
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Canva failed.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Enhance</CardTitle>
        <CardDescription>
          Generate visuals, add a voiceover, or design in Canva.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <label className="text-sm font-medium">Generate an image with AI</label>
          {configured.openai ? (
            <>
              <input
                value={imagePrompt}
                onChange={(event) => setImagePrompt(event.target.value)}
                placeholder="e.g. cozy cafe latte art, warm lighting"
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
              />
              <Button
                type="button"
                size="sm"
                onClick={handleGenerateImage}
                disabled={busy !== null}
              >
                {busy === "image" ? "Generating…" : "Generate image"}
              </Button>
            </>
          ) : (
            <p className="text-xs text-slate-500">
              Add <code>OPENAI_API_KEY</code> to generate images.
            </p>
          )}
        </div>

        <div className="space-y-2 border-t border-slate-100 pt-4 dark:border-slate-800">
          <label className="text-sm font-medium">Voiceover</label>
          {configured.elevenlabs ? (
            <>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={handleVoiceover}
                disabled={busy !== null}
              >
                {busy === "audio" ? "Generating…" : "Add voiceover from caption"}
              </Button>
              {audioUrl ? (
                <audio src={audioUrl} controls className="mt-2 w-full" />
              ) : null}
            </>
          ) : (
            <p className="text-xs text-slate-500">
              Add <code>ELEVENLABS_API_KEY</code> to generate voiceovers.
            </p>
          )}
        </div>

        <div className="space-y-2 border-t border-slate-100 pt-4 dark:border-slate-800">
          <label className="text-sm font-medium">Edit in Canva</label>
          {configured.canva ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleEditInCanva}
              disabled={busy !== null}
            >
              {busy === "canva" ? "Opening…" : "Open Canva editor"}
            </Button>
          ) : (
            <p className="text-xs text-slate-500">
              Add <code>CANVA_CLIENT_ID</code> and{" "}
              <code>CANVA_CLIENT_SECRET</code> to design in Canva.
            </p>
          )}
        </div>

        {error ? (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
