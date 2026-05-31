const DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM"; // ElevenLabs "Rachel"

export async function generateVoiceover(
  text: string,
  apiKey: string,
): Promise<{
  buffer: Buffer;
  mimeType: string;
}> {
  const voiceId = process.env.ELEVENLABS_VOICE_ID ?? DEFAULT_VOICE_ID;

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
      }),
      signal: AbortSignal.timeout(60_000),
    },
  );

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(
      `ElevenLabs voiceover failed (${response.status}): ${detail.slice(0, 200)}`,
    );
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  return { buffer, mimeType: "audio/mpeg" };
}
