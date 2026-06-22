import type { BusinessConfig } from "./schemas";

export function buildExtractionPrompt(config: BusinessConfig): string {
  const { business, extraction } = config;
  const rules = extraction.receipt_rules.map((rule) => `- ${rule}`).join("\n");

  return `You are a receipt data extraction system for a ${business.industry} business called ${business.name}.
${extraction.prompt_context}

Extract ALL line items from this receipt image. Return ONLY valid JSON with no other text.

Required JSON format:
{
  "merchant": "Store name exactly as printed",
  "merchant_address": "Full address if visible",
  "date": "YYYY-MM-DD format",
  "time": "HH:MM if visible, null otherwise",
  "receipt_id": "Receipt/transaction number if visible, null otherwise",
  "payment_method": "VISA/CASH/CHECK etc if visible, null otherwise",
  "items": [
    {
      "raw_description": "Exact text from receipt for this ${extraction.item_term}",
      "name": "Clean, human-readable ${extraction.item_term} name",
      "quantity": 0.0,
      "unit": "lb/oz/sheet/pkg/ea/gal/cs/bag",
      "unit_price": 0.00,
      "total_price": 0.00
    }
  ],
  "subtotal": 0.00,
  "tax": 0.00,
  "total": 0.00
}

Rules:
- Extract EVERY line item, even packaging supplies (bags, trays, labels)
- Calculate unit_price as total_price / quantity when not explicitly shown
- Use null for any field you cannot determine from the receipt
- Ensure all prices are numbers (not strings), without dollar signs
- The date should always be YYYY-MM-DD even if printed differently on the receipt
${rules}
`;
}
