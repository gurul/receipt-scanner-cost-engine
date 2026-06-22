import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db/client";
import { shortcutToken } from "@/lib/db/schema";
import { assertSameOrigin } from "@/lib/security/request";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ tokenId: string }> },
) {
  assertSameOrigin(request);
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const { tokenId } = await params;
  await db.update(shortcutToken).set({ revokedAt: new Date() }).where(and(
    eq(shortcutToken.id, tokenId),
    eq(shortcutToken.userId, session.user.id),
  ));
  return NextResponse.json({ status: "revoked" });
}
