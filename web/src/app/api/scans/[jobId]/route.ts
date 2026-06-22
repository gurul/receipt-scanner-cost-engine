import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { requireGoogleContext, AuthenticationRequiredError } from "@/lib/auth/context";
import { db } from "@/lib/db/client";
import { scanJob } from "@/lib/db/schema";
import { createGoogleClients, readJsonFile } from "@/lib/google";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> },
) {
  try {
    const { session, accessToken } = await requireGoogleContext(request.headers);
    const { jobId } = await params;
    const [job] = await db.select().from(scanJob).where(and(
      eq(scanJob.id, jobId),
      eq(scanJob.userId, session.user.id),
    )).limit(1);
    if (!job?.driveResultFileId) {
      return NextResponse.json({ error: "Receipt review was not found" }, { status: 404 });
    }
    const { drive } = createGoogleClients(accessToken);
    const document = await readJsonFile<{ receipt: unknown; status: string }>(
      drive,
      job.driveResultFileId,
    );
    return NextResponse.json({ jobId, status: job.status, receipt: document.receipt });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: "Could not load this receipt review" }, { status: 400 });
  }
}
