import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireGoogleContext, AuthenticationRequiredError } from "@/lib/auth/context";
import { db } from "@/lib/db/client";
import { user } from "@/lib/db/schema";
import { createGoogleClients, permanentlyDeleteFile } from "@/lib/google";
import { getWorkspace } from "@/lib/workspace/repository";
import { assertSameOrigin } from "@/lib/security/request";

const inputSchema = z.object({ deleteDriveFiles: z.boolean() });

export async function DELETE(request: Request) {
  try {
    assertSameOrigin(request);
    const { session, accessToken } = await requireGoogleContext(request.headers);
    const { deleteDriveFiles } = inputSchema.parse(await request.json());
    const workspace = await getWorkspace(session.user.id);
    const { drive } = createGoogleClients(accessToken);

    if (deleteDriveFiles && workspace?.rootFolderId) {
      await permanentlyDeleteFile(drive, workspace.rootFolderId);
    } else if (workspace?.anthropicVaultFileId) {
      await permanentlyDeleteFile(drive, workspace.anthropicVaultFileId);
    }

    const revoke = await fetch("https://oauth2.googleapis.com/revoke", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ token: accessToken }),
    });
    if (!revoke.ok) throw new Error("Google authorization revocation failed");

    await db.delete(user).where(eq(user.id, session.user.id));
    return NextResponse.json({
      status: "deleted",
      driveFilesDeleted: deleteDriveFiles,
    });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("Account deletion failed", { error: error instanceof Error ? error.name : "UnknownError" });
    return NextResponse.json({ error: "Account deletion could not be completed" }, { status: 400 });
  }
}
