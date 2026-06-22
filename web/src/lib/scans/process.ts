import Anthropic from "@anthropic-ai/sdk";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { AnthropicReceiptProvider } from "@/lib/ai";
import { CredentialVault } from "@/lib/credentials/vault";
import { businessConfigSchema, mapReceiptItems } from "@/lib/domain";
import { db } from "@/lib/db/client";
import { scanJob, workspace as workspaceTable } from "@/lib/db/schema";
import {
  createGoogleClients,
  createJsonFile,
  DriveVaultDocumentStore,
  readJsonFile,
  uploadReceiptImage,
} from "@/lib/google";
import { validateReceiptImage } from "@/lib/security/image";
import { googleKmsCipher } from "@/lib/security/kms";
import { getWorkspace } from "@/lib/workspace/repository";

export async function processReceiptScan(input: {
  userId: string;
  accessToken: string;
  data: Uint8Array;
  source: string;
  shortcutTokenId?: string;
}) {
  const jobId = randomUUID();
  let jobCreated = false;

  try {
    const mediaType = validateReceiptImage(input.data);
    const workspace = await getWorkspace(input.userId);
    if (
      !workspace?.receiptsFolderId ||
      !workspace.configFileId ||
      !workspace.rootFolderId ||
      !workspace.anthropicVaultFileId ||
      workspace.status !== "ready"
    ) {
      throw new Error("Complete onboarding and add an Anthropic key first");
    }

    await db.insert(scanJob).values({
      id: jobId,
      userId: input.userId,
      shortcutTokenId: input.shortcutTokenId,
      source: input.source,
      status: "uploading",
      attemptCount: 1,
    });
    jobCreated = true;

    const { drive } = createGoogleClients(input.accessToken);
    const extension = mediaType.split("/")[1].replace("jpeg", "jpg");
    const imageFileId = await uploadReceiptImage(
      drive,
      workspace.receiptsFolderId,
      `receipt-${new Date().toISOString().replaceAll(":", "-")}-${jobId}.${extension}`,
      input.data,
      mediaType,
    );
    await db.update(scanJob).set({
      status: "extracting",
      driveImageFileId: imageFileId,
      updatedAt: new Date(),
    }).where(eq(scanJob.id, jobId));

    const config = businessConfigSchema.parse(
      await readJsonFile(drive, workspace.configFileId),
    );
    const apiKey = await new CredentialVault(
      googleKmsCipher,
      new DriveVaultDocumentStore(drive, workspace.rootFolderId),
    ).load(input.userId, workspace.anthropicVaultFileId);
    const extracted = await new AnthropicReceiptProvider(apiKey).extractReceipt(
      { data: input.data, mediaType },
      config,
    );
    const mapped = mapReceiptItems(extracted, config.items.aliases);
    const resultFileId = await createJsonFile(
      drive,
      `receipt-${jobId}.json`,
      workspace.receiptsFolderId,
      { version: 1, status: "awaiting_review", image_file_id: imageFileId, receipt: mapped },
    );
    await db.update(scanJob).set({
      status: "awaiting_review",
      driveResultFileId: resultFileId,
      updatedAt: new Date(),
    }).where(eq(scanJob.id, jobId));
    return { jobId, receipt: mapped };
  } catch (error) {
    if (jobCreated) {
      await db.update(scanJob).set({
        status: "failed",
        errorCode: error instanceof Anthropic.AuthenticationError
          ? "anthropic_authentication_failed"
          : "scan_failed",
        updatedAt: new Date(),
      }).where(eq(scanJob.id, jobId)).catch(() => undefined);
    }
    if (error instanceof Anthropic.AuthenticationError) {
      await db.update(workspaceTable).set({
        anthropicKeyStatus: "invalid",
        status: "needs_anthropic_key",
        updatedAt: new Date(),
      }).where(eq(workspaceTable.userId, input.userId)).catch(() => undefined);
    }
    throw Object.assign(error instanceof Error ? error : new Error("Scan failed"), { jobId });
  }
}
