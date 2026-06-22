import { and, count, eq, gt } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { scanJob } from "@/lib/db/schema";

export class ScanRateLimitError extends Error {}

export async function enforceUserScanRateLimit(userId: string): Promise<void> {
  const now = Date.now();
  const [[minute], [day]] = await Promise.all([
    db.select({ value: count() }).from(scanJob).where(and(
      eq(scanJob.userId, userId),
      gt(scanJob.createdAt, new Date(now - 60_000)),
    )),
    db.select({ value: count() }).from(scanJob).where(and(
      eq(scanJob.userId, userId),
      gt(scanJob.createdAt, new Date(now - 86_400_000)),
    )),
  ]);
  if (minute.value >= 20) throw new ScanRateLimitError("Too many scans. Wait one minute and retry.");
  if (day.value >= 500) throw new ScanRateLimitError("This account reached its daily scan limit.");
}
