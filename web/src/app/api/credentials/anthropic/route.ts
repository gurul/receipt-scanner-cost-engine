import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { AnthropicReceiptProvider } from "@/lib/ai";
import { requireGoogleContext, AuthenticationRequiredError } from "@/lib/auth/context";
import { CredentialVault } from "@/lib/credentials/vault";
import { db } from "@/lib/db/client";
import { workspace } from "@/lib/db/schema";
import { createGoogleClients, DriveVaultDocumentStore } from "@/lib/google";
import { googleKmsCipher } from "@/lib/security/kms";
import { getWorkspace } from "@/lib/workspace/repository";
import { assertSameOrigin } from "@/lib/security/request";

const inputSchema = z.object({ apiKey: z.string().min(20) });

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const { session, accessToken } = await requireGoogleContext(request.headers);
    const { apiKey } = inputSchema.parse(await request.json());
    const record = await getWorkspace(session.user.id);
    if (!record?.rootFolderId) {
      return NextResponse.json({ error: "Complete workspace setup first" }, { status: 409 });
    }

    await new AnthropicReceiptProvider(apiKey).validateCredential();
    const { drive } = createGoogleClients(accessToken);
    const vault = new CredentialVault(
      googleKmsCipher,
      new DriveVaultDocumentStore(drive, record.rootFolderId),
    );
    const saved = await vault.save(
      session.user.id,
      record.anthropicVaultFileId,
      apiKey,
    );
    await db.update(workspace).set({
      anthropicVaultFileId: saved.fileId,
      anthropicKeyFingerprint: saved.fingerprint,
      anthropicKeyStatus: "valid",
      status: "ready",
      updatedAt: new Date(),
    }).where(eq(workspace.userId, session.user.id));

    return NextResponse.json({ status: "valid", fingerprint: saved.fingerprint });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof Anthropic.AuthenticationError) {
      return NextResponse.json({ error: "Anthropic rejected this API key" }, { status: 400 });
    }
    console.error("Anthropic credential save failed", {
      error: error instanceof Error ? error.name : "UnknownError",
    });
    return NextResponse.json({ error: "Could not save the Anthropic key" }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    assertSameOrigin(request);
    const { session, accessToken } = await requireGoogleContext(request.headers);
    const record = await getWorkspace(session.user.id);
    if (record?.anthropicVaultFileId && record.rootFolderId) {
      const { drive } = createGoogleClients(accessToken);
      await new CredentialVault(
        googleKmsCipher,
        new DriveVaultDocumentStore(drive, record.rootFolderId),
      ).delete(record.anthropicVaultFileId);
    }
    await db.update(workspace).set({
      anthropicVaultFileId: null,
      anthropicKeyFingerprint: null,
      anthropicKeyStatus: "missing",
      status: "needs_anthropic_key",
      updatedAt: new Date(),
    }).where(eq(workspace.userId, session.user.id));
    return NextResponse.json({ status: "missing" });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: "Could not delete the Anthropic key" }, { status: 400 });
  }
}
