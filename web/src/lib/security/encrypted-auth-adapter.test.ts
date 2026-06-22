import { describe, expect, it } from "vitest";
import type { SecretCipher } from "./kms";
import { decryptAccountFields, encryptAccountFields } from "./encrypted-auth-adapter";

const cipher: SecretCipher = {
  async encrypt(plaintext, context) {
    return `encrypted:${context}:${plaintext}`;
  },
  async decrypt(ciphertext, context) {
    const prefix = `encrypted:${context}:`;
    if (!ciphertext.startsWith(prefix)) throw new Error("bad context");
    return ciphertext.slice(prefix.length);
  },
};

describe("OAuth account field encryption", () => {
  it("encrypts token fields and binds them to the user and field", async () => {
    const encrypted = await encryptAccountFields({
      userId: "user-1",
      providerId: "google",
      accessToken: "access",
      refreshToken: "refresh",
    }, cipher);

    expect(encrypted.accessToken).toContain("shapersai:oauth:user-1:accessToken:v1");
    expect(encrypted.accessToken.endsWith(":refresh")).toBe(false);
    await expect(decryptAccountFields(encrypted, cipher)).resolves.toMatchObject({
      accessToken: "access",
      refreshToken: "refresh",
    });
  });

  it("refuses to protect a token without an owning user", async () => {
    await expect(encryptAccountFields({ accessToken: "access" }, cipher)).rejects.toThrow(
      "without an OAuth account userId",
    );
  });
});
