import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { businessConfigSchema } from "@/lib/domain";
import { requireGoogleContext, AuthenticationRequiredError } from "@/lib/auth/context";
import { db } from "@/lib/db/client";
import { workspace } from "@/lib/db/schema";
import { provisionGoogleWorkspace } from "@/lib/google";
import { assertSameOrigin } from "@/lib/security/request";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const { session, accessToken } = await requireGoogleContext(request.headers);
    const config = businessConfigSchema.parse(await request.json());
    const existing = await db.select({ id: workspace.id })
      .from(workspace)
      .where(eq(workspace.userId, session.user.id))
      .limit(1);
    if (existing.length) {
      return NextResponse.json({ error: "Workspace is already provisioned" }, { status: 409 });
    }

    const provisioned = await provisionGoogleWorkspace(accessToken, config);
    await db.insert(workspace).values({
      id: randomUUID(),
      userId: session.user.id,
      status: "needs_anthropic_key",
      ...provisioned,
    });
    return NextResponse.json({
      status: "needs_anthropic_key",
      spreadsheetId: provisioned.spreadsheetId,
    });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("Workspace provisioning failed", {
      error: error instanceof Error ? error.name : "UnknownError",
    });
    return NextResponse.json({ error: "Could not create your Google workspace" }, { status: 400 });
  }
}
