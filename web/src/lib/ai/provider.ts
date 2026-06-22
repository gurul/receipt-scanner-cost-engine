import type { BusinessConfig, ExtractedReceipt } from "@/lib/domain";

export type ReceiptImage = {
  data: Uint8Array;
  mediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp";
};

export interface ReceiptExtractionProvider {
  extractReceipt(image: ReceiptImage, config: BusinessConfig): Promise<ExtractedReceipt>;
  validateCredential(): Promise<void>;
}
