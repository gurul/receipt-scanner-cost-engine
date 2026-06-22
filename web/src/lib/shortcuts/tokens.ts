import { count, and, eq, gt, isNull, or } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { scanJob, shortcutToken } from "@/lib/db/schema";
import { hashShortcutToken, isShortcutTokenShape } from "@/lib/security/shortcut-token";

export class InvalidShortcutTokenError extends Error {}
export class ShortcutRateLimitError extends Error {}

function pepper(): string {
  const value = process.env.SHORTCUT_TOKEN_PEPPER;
  if (!value || value.length < 32) throw new Error("SHORTCUT_TOKEN_PEPPER is not configured");
  return value;
}

export async function authenticateShortcutToken(rawToken: string) {
  if (!isShortcutTokenShape(rawToken)) throw new InvalidShortcutTokenError("Invalid Shortcut token");
  const hash = hashShortcutToken(rawToken, pepper());
  const [record] = await db.select().from(shortcutToken).where(and(
    eq(shortcutToken.tokenHash, hash),
    isNull(shortcutToken.revokedAt),
    or(isNull(shortcutToken.expiresAt), gt(shortcutToken.expiresAt, new Date())),
  )).limit(1);
  if (!record) throw new InvalidShortcutTokenError("Invalid or revoked Shortcut token");
  return record;
}

export async function enforceShortcutRateLimit(tokenId: string): Promise<void> {
  const now = Date.now();
  const minuteAgo = new Date(now - 60_000);
  const dayAgo = new Date(now - 86_400_000);
  const [[minute], [day]] = await Promise.all([
    db.select({ value: count() }).from(scanJob).where(and(
      eq(scanJob.shortcutTokenId, tokenId),
      gt(scanJob.createdAt, minuteAgo),
    )),
    db.select({ value: count() }).from(scanJob).where(and(
      eq(scanJob.shortcutTokenId, tokenId),
      gt(scanJob.createdAt, dayAgo),
    )),
  ]);
  if (minute.value >= 5) throw new ShortcutRateLimitError("Too many scans. Wait one minute and retry.");
  if (day.value >= 100) throw new ShortcutRateLimitError("This Shortcut reached its daily scan limit.");
}
