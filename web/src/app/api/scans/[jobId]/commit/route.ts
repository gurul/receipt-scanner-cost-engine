import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { requireGoogleContext, AuthenticationRequiredError } from "@/lib/auth/context";
import { businessConfigSchema, mappedReceiptSchema } from "@/lib/domain";
import { db } from "@/lib/db/client";
import { scanJob } from "@/lib/db/schema";
import {
  appendReceipt,
  createGoogleClients,
  readJsonFile,
  updateJsonFile,
} from "@/lib/google";
import { getWorkspace } from "@/lib/workspace/repository";
import { assertSameOrigin } from "@/lib/security/request";

export const maxDuration = 60;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> },
) {
  try {
    assertSameOrigin(request);
    const { session, accessToken } = await requireGoogleContext(request.headers);
    const { jobId } = await params;
    const receipt = mappedReceiptSchema.parse(await request.json());
    const [job] = await db.select().from(scanJob).where(and(
      eq(scanJob.id, jobId),
      eq(scanJob.userId, session.user.id),
    )).limit(1);
    if (!job || job.status !== "awaiting_review") {
      return NextResponse.json({ error: "This receipt is not awaiting review" }, { status: 409 });
    }
    const workspace = await getWorkspace(session.user.id);
    if (!workspace?.spreadsheetId || !workspace.configFileId || !job.driveResultFileId) {
      return NextResponse.json({ error: "Workspace is incomplete" }, { status: 409 });
    }

    const { drive, sheets } = createGoogleClients(accessToken);
    const config = businessConfigSchema.parse(
      await readJsonFile(drive, workspace.configFileId),
    );
    const committed = await appendReceipt(
      sheets,
      workspace.spreadsheetId,
      receipt,
      config,
      job.source,
    );
    await updateJsonFile(drive, job.driveResultFileId, {
      version: 1,
      status: "committed",
      image_file_id: job.driveImageFileId,
      receipt,
      commit: {
        receipt_id: committed.receiptId,
        rows_appended: committed.rowsAppended,
        committed_at: new Date().toISOString(),
      },
    });
    await db.update(scanJob).set({
      status: "completed",
      errorCode: null,
      completedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(scanJob.id, jobId));

    return NextResponse.json(committed);
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("Receipt commit failed", {
      error: error instanceof Error ? error.name : "UnknownError",
    });
    return NextResponse.json({
      error: error instanceof Error && error.message.startsWith("Duplicate receipt")
        ? error.message
        : "Could not commit this receipt",
    }, { status: 400 });
  }
}
