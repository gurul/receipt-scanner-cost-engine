import { describe, expect, it } from "vitest";
import { detectReceiptImage, MAX_RECEIPT_BYTES, validateReceiptImage } from "./image";

describe("receipt image validation", () => {
  it("uses magic bytes instead of the browser content type", () => {
    const jpeg = new Uint8Array([0xff, 0xd8, 0xff, ...new Array(20).fill(0)]);
    expect(detectReceiptImage(jpeg)).toBe("image/jpeg");
  });

  it("rejects unknown and oversized payloads", () => {
    expect(() => detectReceiptImage(new Uint8Array(20))).toThrow("supported");
    expect(() => validateReceiptImage(new Uint8Array(MAX_RECEIPT_BYTES + 1))).toThrow("3.5 MB");
  });
});
