import { describe, expect, it } from "vitest";

import { renderPresetMessage } from "@/lib/auto-replies";

describe("auto-reply presets", () => {
  it("replaces business and link placeholders", () => {
    const message = renderPresetMessage(
      "Hi! Thanks for messaging {business}. Visit {link}",
      {
        businessName: "Acme HVAC",
        link: "https://example.com/p/acme/offer",
      },
    );

    expect(message).toContain("Acme HVAC");
    expect(message).toContain("https://example.com/p/acme/offer");
  });
});
