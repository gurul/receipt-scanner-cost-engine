import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { buildExtractionPrompt, extractedReceiptSchema } from "@/lib/domain";
import type { BusinessConfig, ExtractedReceipt } from "@/lib/domain";
import type { ReceiptExtractionProvider, ReceiptImage } from "./provider";

const anthropicOutputSchema = z.object({
  merchant: z.string(),
  merchant_address: z.string().nullable(),
  date: z.string().nullable(),
  time: z.string().nullable(),
  receipt_id: z.string().nullable(),
  payment_method: z.string().nullable(),
  items: z.array(z.object({
    raw_description: z.string(),
    name: z.string(),
    quantity: z.number(),
    unit: z.string(),
    unit_price: z.number().nullable(),
    total_price: z.number(),
  })),
  subtotal: z.number().nullable(),
  tax: z.number().nullable(),
  total: z.number(),
});

export class AnthropicReceiptProvider implements ReceiptExtractionProvider {
  private readonly client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async validateCredential(): Promise<void> {
    await this.client.models.list({ limit: 1 });
  }

  async extractReceipt(
    image: ReceiptImage,
    config: BusinessConfig,
  ): Promise<ExtractedReceipt> {
    const message = await this.client.messages.parse({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      output_config: {
        format: zodOutputFormat(anthropicOutputSchema),
      },
      messages: [{
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: image.mediaType,
              data: Buffer.from(image.data).toString("base64"),
            },
          },
          { type: "text", text: buildExtractionPrompt(config) },
        ],
      }],
    });

    if (!message.parsed_output) {
      throw new Error("Anthropic returned no structured receipt data");
    }
    return extractedReceiptSchema.parse(message.parsed_output);
  }
}
