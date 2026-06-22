import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db/client";
import { shortcutToken } from "@/lib/db/schema";
import { createShortcutToken, hashShortcutToken } from "@/lib/security/shortcut-token";
import { getWorkspace } from "@/lib/workspace/repository";
import { assertSameOrigin } from "@/lib/security/request";

const inputSchema = z.object({ label: z.string().trim().min(1).max(60).default("iPhone Shortcut") });

function pepper(): string {
  const value = process.env.SHORTCUT_TOKEN_PEPPER;
  if (!value || value.length < 32) throw new Error("Shortcut token encryption is not configured");
  return value;
}

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const tokens = await db.select({
    id: shortcutToken.id,
    label: shortcutToken.label,
    createdAt: shortcutToken.createdAt,
    lastUsedAt: shortcutToken.lastUsedAt,
    expiresAt: shortcutToken.expiresAt,
    revokedAt: shortcutToken.revokedAt,
  }).from(shortcutToken).where(eq(shortcutToken.userId, session.user.id)).orderBy(desc(shortcutToken.createdAt));
  return NextResponse.json({ tokens });
}

export async function POST(request: Request) {
  assertSameOrigin(request);
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const workspace = await getWorkspace(session.user.id);
  if (workspace?.status !== "ready") {
    return NextResponse.json({ error: "Finish setup before creating a Shortcut" }, { status: 409 });
  }
  const { label } = inputSchema.parse(await request.json().catch(() => ({})));
  const token = createShortcutToken();
  const id = randomUUID();
  await db.insert(shortcutToken).values({
    id,
    userId: session.user.id,
    label,
    tokenHash: hashShortcutToken(token, pepper()),
  });
  return NextResponse.json({ id, token, label }, { status: 201 });
}
