import type { ReceiptImage } from "@/lib/ai";

export const MAX_RECEIPT_BYTES = 3_500_000;

export function detectReceiptImage(data: Uint8Array): ReceiptImage["mediaType"] {
  if (data.length < 16) throw new Error("Image is empty or truncated");
  if (data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) return "image/jpeg";
  if (
    data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4e && data[3] === 0x47 &&
    data[4] === 0x0d && data[5] === 0x0a && data[6] === 0x1a && data[7] === 0x0a
  ) return "image/png";
  const header = Buffer.from(data.subarray(0, 16)).toString("ascii");
  if (header.startsWith("GIF87a") || header.startsWith("GIF89a")) return "image/gif";
  if (header.startsWith("RIFF") && header.slice(8, 12) === "WEBP") return "image/webp";
  throw new Error("Only JPEG, PNG, GIF, and WebP receipts are supported");
}

export function validateReceiptImage(data: Uint8Array): ReceiptImage["mediaType"] {
  if (data.length > MAX_RECEIPT_BYTES) {
    throw new Error("Receipt image must be smaller than 3.5 MB");
  }
  return detectReceiptImage(data);
}
