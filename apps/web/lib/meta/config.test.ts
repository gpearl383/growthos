import { describe, expect, it } from "vitest";

import { createOAuthState, parseOAuthState } from "@/lib/meta/config";

describe("Meta OAuth state", () => {
  it("round-trips signed tenant state", () => {
    process.env.META_APP_SECRET = "test-secret";

    const state = createOAuthState("tenant-123");
    const parsed = parseOAuthState(state);

    expect(parsed?.tenantId).toBe("tenant-123");
  });

  it("rejects tampered state", () => {
    process.env.META_APP_SECRET = "test-secret";
    const state = createOAuthState("tenant-123");
    const tampered = `${state}x`;
    expect(parseOAuthState(tampered)).toBeNull();
  });
});
