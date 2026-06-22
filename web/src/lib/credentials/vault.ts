import { createHash } from "node:crypto";
import type { SecretCipher } from "@/lib/security/kms";

export type CredentialStatus = "missing" | "valid" | "invalid";

export type VaultDocument = {
  version: 1;
  provider: "anthropic";
  ciphertext: string;
  fingerprint: string;
  updated_at: string;
};

export interface VaultDocumentStore {
  read(fileId: string): Promise<VaultDocument>;
  write(fileId: string | null, document: VaultDocument): Promise<string>;
  delete(fileId: string): Promise<void>;
}

export function fingerprintApiKey(apiKey: string): string {
  return createHash("sha256").update(apiKey, "utf8").digest("hex").slice(0, 12);
}

export class CredentialVault {
  constructor(
    private readonly cipher: SecretCipher,
    private readonly store: VaultDocumentStore,
  ) {}

  async save(userId: string, currentFileId: string | null, apiKey: string) {
    if (!apiKey.trim()) throw new Error("Anthropic API key is required");
    const fingerprint = fingerprintApiKey(apiKey);
    const ciphertext = await this.cipher.encrypt(apiKey, this.context(userId));
    const fileId = await this.store.write(currentFileId, {
      version: 1,
      provider: "anthropic",
      ciphertext,
      fingerprint,
      updated_at: new Date().toISOString(),
    });
    return { fileId, fingerprint };
  }

  async load(userId: string, fileId: string): Promise<string> {
    const document = await this.store.read(fileId);
    if (document.version !== 1 || document.provider !== "anthropic") {
      throw new Error("Unsupported credential vault format");
    }
    return this.cipher.decrypt(document.ciphertext, this.context(userId));
  }

  async delete(fileId: string): Promise<void> {
    await this.store.delete(fileId);
  }

  private context(userId: string): string {
    return `shapersai:anthropic:${userId}:v1`;
  }
}
