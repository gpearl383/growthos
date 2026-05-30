import { describe, expect, it } from "vitest";

import { matchesKeywords } from "@/lib/meta/auto-reply-matching";

describe("auto-reply keyword matching", () => {
  it("matches keywords case-insensitively", () => {
    expect(matchesKeywords("Can I get info please?", ["INFO", "PRICE"])).toBe(
      true,
    );
    expect(matchesKeywords("Love this photo!", ["INFO", "PRICE"])).toBe(false);
  });
});
