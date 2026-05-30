import { describe, expect, it } from "vitest";

import { decryptToken, encryptToken } from "@/lib/meta/token-crypto";

describe("token crypto", () => {
  it("encrypts and decrypts access tokens", () => {
    process.env.TOKEN_ENCRYPTION_KEY = "test-encryption-key";

    const encrypted = encryptToken("meta-access-token-123");
    const decrypted = decryptToken(encrypted);

    expect(decrypted).toBe("meta-access-token-123");
    expect(encrypted).not.toContain("meta-access-token-123");
  });
});
