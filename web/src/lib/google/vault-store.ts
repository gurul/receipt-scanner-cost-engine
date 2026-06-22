import type { drive_v3 } from "googleapis";
import type { VaultDocument, VaultDocumentStore } from "@/lib/credentials/vault";
import {
  createJsonFile,
  permanentlyDeleteFile,
  readJsonFile,
  updateJsonFile,
} from "./drive";

const VAULT_FILENAME = "ShapersAI Credential Vault.json";

export class DriveVaultDocumentStore implements VaultDocumentStore {
  constructor(
    private readonly drive: drive_v3.Drive,
    private readonly parentFolderId: string,
  ) {}

  read(fileId: string): Promise<VaultDocument> {
    return readJsonFile<VaultDocument>(this.drive, fileId);
  }

  async write(fileId: string | null, document: VaultDocument): Promise<string> {
    if (fileId) {
      await updateJsonFile(this.drive, fileId, document);
      return fileId;
    }
    return createJsonFile(this.drive, VAULT_FILENAME, this.parentFolderId, document);
  }

  delete(fileId: string): Promise<void> {
    return permanentlyDeleteFile(this.drive, fileId);
  }
}
