import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { requireGoogleContext, AuthenticationRequiredError } from "@/lib/auth/context";
import { processReceiptScan } from "@/lib/scans/process";
import { enforceUserScanRateLimit, ScanRateLimitError } from "@/lib/scans/rate-limit";
import { assertSameOrigin } from "@/lib/security/request";

export const maxDuration = 120;

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const context = await requireGoogleContext(request.headers);
    await enforceUserScanRateLimit(context.session.user.id);
    const form = await request.formData();
    const file = form.get("receipt");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Choose a receipt image" }, { status: 400 });
    }
    return NextResponse.json(await processReceiptScan({
      userId: context.session.user.id,
      accessToken: context.accessToken,
      data: new Uint8Array(await file.arrayBuffer()),
      source: String(form.get("source") ?? "website"),
    }));
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof ScanRateLimitError) {
      return NextResponse.json({ error: error.message }, { status: 429 });
    }
    const message = error instanceof Error ? error.message : "Receipt processing failed";
    const safeMessage = error instanceof Anthropic.AuthenticationError
      ? "Your Anthropic key is no longer valid. Replace it in Settings and retry."
      : message.startsWith("Receipt image") || message.startsWith("Only ") || message.startsWith("Complete ")
        ? message
        : "Receipt processing failed. Your Drive copy was kept for retry.";
    console.error("Receipt scan failed", {
      jobId: error && typeof error === "object" && "jobId" in error ? error.jobId : undefined,
      error: error instanceof Error ? error.name : "UnknownError",
    });
    return NextResponse.json({ error: safeMessage }, { status: 400 });
  }
}
