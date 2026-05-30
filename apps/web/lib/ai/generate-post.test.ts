import { beforeEach, describe, expect, it, vi } from "vitest";

describe("generatePostContent fallback", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("ANTHROPIC_API_KEY", "");
  });

  it("returns a starter post without Anthropic configured", async () => {
    const { generatePostContent } = await import("@/lib/ai/generate-post");

    const post = await generatePostContent({
      businessName: "Acme HVAC",
      businessType: "local_services",
      offerText: "Free estimates on new AC installs.",
      goal: "bookings",
      platform: "instagram",
      photoDescription: "Before and after install",
    });

    expect(post.hook).toContain("Acme HVAC");
    expect(post.caption).toContain("Free estimates");
    expect(post.hashtags).toContain("#SmallBusiness");
  });

  it("returns a TikTok starter post without Anthropic configured", async () => {
    const { generatePostContent } = await import("@/lib/ai/generate-post");

    const post = await generatePostContent({
      businessName: "Acme HVAC",
      businessType: "local_services",
      offerText: "Free estimates on new AC installs.",
      goal: "bookings",
      platform: "tiktok",
      photoDescription: "Quick install timelapse",
    });

    expect(post.hook).toContain("Acme HVAC");
    expect(post.caption).toContain("Link in bio");
  });
});
