import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db/client";
import { shortcutToken } from "@/lib/db/schema";
import { processReceiptScan } from "@/lib/scans/process";
import {
  authenticateShortcutToken,
  enforceShortcutRateLimit,
  InvalidShortcutTokenError,
  ShortcutRateLimitError,
} from "@/lib/shortcuts/tokens";

export const maxDuration = 120;

export async function POST(request: Request) {
  try {
    const authorization = request.headers.get("authorization") ?? "";
    const rawToken = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
    const token = await authenticateShortcutToken(rawToken);
    await enforceShortcutRateLimit(token.id);
    const googleToken = await auth.api.getAccessToken({
      body: { providerId: "google", userId: token.userId },
    });
    if (!googleToken.accessToken) throw new Error("Google authorization is unavailable");
    const result = await processReceiptScan({
      userId: token.userId,
      accessToken: googleToken.accessToken,
      data: new Uint8Array(await request.arrayBuffer()),
      source: `shortcut:${token.label}`,
      shortcutTokenId: token.id,
    });
    await db.update(shortcutToken).set({ lastUsedAt: new Date() }).where(eq(shortcutToken.id, token.id));
    return NextResponse.json({
      status: "awaiting_review",
      jobId: result.jobId,
      message: `${result.receipt.items.length} items extracted. Open ShapersAI to review and commit.`,
      reviewUrl: new URL(`/dashboard/scan?jobId=${result.jobId}`, request.url).toString(),
    });
  } catch (error) {
    if (error instanceof InvalidShortcutTokenError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof ShortcutRateLimitError) {
      return NextResponse.json({ error: error.message }, { status: 429 });
    }
    console.error("Shortcut scan failed", { error: error instanceof Error ? error.name : "UnknownError" });
    return NextResponse.json({ error: "Shortcut scan failed. Open ShapersAI for details." }, { status: 400 });
  }
}
