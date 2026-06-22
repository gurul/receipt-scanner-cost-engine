import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { workspace } from "@/lib/db/schema";

export type WorkspaceRecord = typeof workspace.$inferSelect;

export async function getWorkspace(userId: string): Promise<WorkspaceRecord | null> {
  const [record] = await db.select().from(workspace).where(eq(workspace.userId, userId)).limit(1);
  return record ?? null;
}
