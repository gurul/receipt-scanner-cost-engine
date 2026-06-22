import { describe, expect, it } from "vitest";
import type { SecretCipher } from "@/lib/security/kms";
import { CredentialVault, type VaultDocument, type VaultDocumentStore } from "./vault";

class MemoryStore implements VaultDocumentStore {
  document: VaultDocument | undefined;
  deleted = false;

  async read() {
    if (!this.document) throw new Error("missing");
    return this.document;
  }
  async write(_fileId: string | null, document: VaultDocument) {
    this.document = document;
    return "drive-file-1";
  }
  async delete() {
    this.deleted = true;
  }
}

const cipher: SecretCipher = {
  async encrypt(value, context) {
    return Buffer.from(`${context}\0${value}`).toString("base64");
  },
  async decrypt(value, context) {
    const decoded = Buffer.from(value, "base64").toString();
    const prefix = `${context}\0`;
    if (!decoded.startsWith(prefix)) throw new Error("wrong owner");
    return decoded.slice(prefix.length);
  },
};

describe("CredentialVault", () => {
  it("stores ciphertext and can recover it only for the owner", async () => {
    const store = new MemoryStore();
    const vault = new CredentialVault(cipher, store);
    const saved = await vault.save("user-1", null, "sk-ant-secret");

    expect(saved.fileId).toBe("drive-file-1");
    expect(store.document?.ciphertext).not.toContain("sk-ant-secret");
    await expect(vault.load("user-1", saved.fileId)).resolves.toBe("sk-ant-secret");
    await expect(vault.load("user-2", saved.fileId)).rejects.toThrow("wrong owner");
  });
});
