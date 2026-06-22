import { describe, expect, it } from "vitest";
import {
  createShortcutToken,
  hashShortcutToken,
  isShortcutTokenShape,
  tokenHashesEqual,
} from "./shortcut-token";

describe("Shortcut tokens", () => {
  it("creates opaque 256-bit credentials", () => {
    const token = createShortcutToken();
    expect(isShortcutTokenShape(token)).toBe(true);
    expect(token).not.toBe(createShortcutToken());
  });

  it("stores only a peppered deterministic hash", () => {
    const token = createShortcutToken();
    const hash = hashShortcutToken(token, "a".repeat(32));
    expect(hash).not.toContain(token);
    expect(tokenHashesEqual(hash, hashShortcutToken(token, "a".repeat(32)))).toBe(true);
    expect(tokenHashesEqual(hash, hashShortcutToken(token, "b".repeat(32)))).toBe(false);
  });
});
