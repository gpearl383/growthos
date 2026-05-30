export async function generateImage(
  prompt: string,
  apiKey: string,
): Promise<{
  buffer: Buffer;
  mimeType: string;
}> {
  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-image-1",
      prompt,
      size: "1024x1024",
      n: 1,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(
      `OpenAI image generation failed (${response.status}): ${detail.slice(0, 200)}`,
    );
  }

  const data = (await response.json()) as {
    data?: Array<{ b64_json?: string; url?: string }>;
  };

  const first = data.data?.[0];

  if (first?.b64_json) {
    return { buffer: Buffer.from(first.b64_json, "base64"), mimeType: "image/png" };
  }

  if (first?.url) {
    const imageResponse = await fetch(first.url);
    const buffer = Buffer.from(await imageResponse.arrayBuffer());
    const mimeType = imageResponse.headers.get("content-type") ?? "image/png";
    return { buffer, mimeType };
  }

  throw new Error("OpenAI did not return an image.");
}
