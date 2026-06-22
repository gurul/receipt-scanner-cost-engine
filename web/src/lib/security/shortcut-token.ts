import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const TOKEN_PREFIX = "shp_sc_";

export function createShortcutToken(): string {
  return `${TOKEN_PREFIX}${randomBytes(32).toString("base64url")}`;
}

export function hashShortcutToken(token: string, pepper: string): string {
  return createHmac("sha256", pepper).update(token, "utf8").digest("base64url");
}

export function isShortcutTokenShape(token: string): boolean {
  if (!token.startsWith(TOKEN_PREFIX)) return false;
  const encoded = token.slice(TOKEN_PREFIX.length);
  try {
    return Buffer.from(encoded, "base64url").length === 32;
  } catch {
    return false;
  }
}

export function tokenHashesEqual(left: string, right: string): boolean {
  const leftBytes = Buffer.from(left, "utf8");
  const rightBytes = Buffer.from(right, "utf8");
  return leftBytes.length === rightBytes.length && timingSafeEqual(leftBytes, rightBytes);
}
